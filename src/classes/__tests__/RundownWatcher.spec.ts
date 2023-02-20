import { ReducedRundown, RundownWatcher } from '../RundownWatcher'
import { mockData, playlist as mockPlaylist } from './__mocks__/mockData'
import { CoreHandler } from '../../coreHandler'
import { VERSION } from '../../version'
import { InewsFTPHandler } from '../../inewsHandler'
import { createDefaultLogger } from '@tv2media/logger'
import { INewsDirItem, INewsStory } from 'inews'
import * as sinon from 'sinon'
import { SegmentId } from '../../helpers/id'
import { INewsStoryGW, RundownSegment } from '../datastructures/Segment'
import { cloneDeep } from 'lodash'
import { literal } from '../../helpers'
import { INewsFile } from 'inews'

let testee: RundownWatcher
let emitFake: ReturnType<typeof createEmitFake>

const createEmitFake = () => {
	return jest.fn((_eventName: string, ..._restArgs: any[]) => {
		return true
	})
}

const recreateTestee = () => {
	const stubLogger = sinon.stub(createDefaultLogger())
	const listFake = sinon.fake((_queueName: string, cb: any) => {
		return cb(null, mockData.dirList)
	})
	const storyStub = sinon.stub()
	const stubiNewsConnection = { list: listFake, story: storyStub } as any
	const stubCoreHandler = sinon.createStubInstance(CoreHandler, {
		// TODO: why doesn't this work without `as any`?
		GetSegmentsCacheById: sinon.stub().resolves(new Map<SegmentId, RundownSegment>()) as any,
	})
	const stubiNewsFTPHandler = sinon.createStubInstance(InewsFTPHandler)

	testee = new RundownWatcher(stubLogger, stubiNewsConnection, stubCoreHandler, [], VERSION, stubiNewsFTPHandler, true)

	emitFake = createEmitFake()
	sinon.replace(testee, 'emit', emitFake)
}

const fakeTesteeForProcessUpdatedRundown = () => {
	const downloadRundownFake = sinon.fake(
		async (_rundownId: string): Promise<ReducedRundown> => {
			return mockPlaylist
		}
	)
	sinon.replace(testee.rundownManager, 'downloadRundown', downloadRundownFake)

	const downloadINewsStoryByIdFake = sinon.fake(
		async (_queueName: string, segmentId: string, _dirList: Array<INewsDirItem>): Promise<INewsStory | undefined> => {
			return mockData.rawSegments.find((rs) => rs.identifier === segmentId)
		}
	)
	sinon.replace(testee.rundownManager, 'downloadINewsStoryById', downloadINewsStoryByIdFake)

	return {
		downloadINewsStoryByIdFake,
		downloadRundownFake,
	}
}

let clonedMockData: typeof mockData

describe('RundownWatcher', () => {
	beforeEach(() => {
		clonedMockData = cloneDeep(mockData)
	})

	afterEach(() => {
		mockData.dirList = clonedMockData.dirList
		mockData.rawSegments = clonedMockData.rawSegments
		mockData.segmentExternalIds = clonedMockData.segmentExternalIds
	})

	describe('processUpdatedRundown', () => {
		describe('from a clean cache', () => {
			beforeEach(() => {
				recreateTestee()
				fakeTesteeForProcessUpdatedRundown()
			})

			it('adds or infers segmentType and isStartOfNewSegmentType, ignoring floats', async () => {
				await testee.checkINewsRundownById(mockData.queueName)

				const expectedSegments = [
					{
						payload: expect.objectContaining({
							segmentType: 'News',
							isStartOfNewSegmentType: true,
							float: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'News',
							isStartOfNewSegmentType: false,
							float: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'News',
							isStartOfNewSegmentType: false,
							float: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: true,
							float: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
							float: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
							float: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
							float: true,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
							float: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Weather',
							isStartOfNewSegmentType: true,
							float: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Weather',
							isStartOfNewSegmentType: false,
							float: false,
						}),
					},
				]

				expect(expectedSegments).toHaveLength(10)

				const actualSegments = emitFake.mock.calls[0][2].segments
				expect(actualSegments).toHaveLength(expectedSegments.length)

				expect(actualSegments[0]).toMatchObject(expectedSegments[0])
				expect(actualSegments[1]).toMatchObject(expectedSegments[1])
				expect(actualSegments[2]).toMatchObject(expectedSegments[2])
				expect(actualSegments[3]).toMatchObject(expectedSegments[3])
				expect(actualSegments[4]).toMatchObject(expectedSegments[4])
				expect(actualSegments[5]).toMatchObject(expectedSegments[5])
				expect(actualSegments[6]).toMatchObject(expectedSegments[6])
				expect(actualSegments[7]).toMatchObject(expectedSegments[7])
				expect(actualSegments[8]).toMatchObject(expectedSegments[8])
				expect(actualSegments[9]).toMatchObject(expectedSegments[9])

				expect(emitFake).toHaveBeenCalledTimes(1)
				expect(emitFake).toHaveBeenNthCalledWith(1, 'rundown_create', expect.any(String), expect.any(Object))
			})
		})

		describe('from a populated cache', () => {
			beforeEach(async () => {
				recreateTestee()
				const fakes = fakeTesteeForProcessUpdatedRundown()
				await testee.checkINewsRundownById(mockData.queueName)

				expect(emitFake).toHaveBeenCalledTimes(1)
				expect(emitFake).toHaveBeenNthCalledWith(1, 'rundown_create', expect.any(String), expect.any(Object))

				fakes.downloadINewsStoryByIdFake.resetHistory()
				fakes.downloadRundownFake.resetHistory()
				emitFake.mockReset()
			})

			it('ignores changes to floated stories when computing segmentType and isStartOfNewSegmentType', async () => {
				// Simulate changes to the mock data
				expect(mockData.rawSegments[6].meta.float).toBe('float') // ensure that we're testing the correct thing
				mockData.rawSegments[6].fields.modifyDate = Math.floor(Date.now() / 1000).toString()
				mockData.rawSegments[6].locator = '11111111:22222222'
				mockData.rawSegments[6].id = `${mockData.rawSegments[8].identifier}:${mockData.rawSegments[8].locator}`

				await testee.checkINewsRundownById(mockData.queueName)

				expect(emitFake).toHaveBeenCalledTimes(0)
			})

			it('cascades updates to segmentType and isStartOfNewSegmentType when a segment goes from not having a segment type to having one', async () => {
				// Simulate changes to the mock data
				mockData.rawSegments[1].fields.vType = 'Economy'
				mockData.rawSegments[1].fields.modifyDate = Math.floor(Date.now() / 1000).toString()
				mockData.rawSegments[1].locator = '11111111:22222222'
				mockData.rawSegments[1].id = `${mockData.rawSegments[1].identifier}:${mockData.rawSegments[1].locator}`

				mockData.rawSegments[2].fields.vType = undefined
				mockData.rawSegments[2].fields.modifyDate = Math.floor(Date.now() / 1000).toString()
				mockData.rawSegments[2].locator = '33333333:44444444'
				mockData.rawSegments[2].id = `${mockData.rawSegments[2].identifier}:${mockData.rawSegments[2].locator}`

				await testee.checkINewsRundownById(mockData.queueName)

				const expectedSegments = [
					{
						payload: expect.objectContaining({
							segmentType: 'News',
							isStartOfNewSegmentType: true,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Economy',
							isStartOfNewSegmentType: true,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Economy',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: true,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Weather',
							isStartOfNewSegmentType: true,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Weather',
							isStartOfNewSegmentType: false,
						}),
					},
				]

				expect(expectedSegments).toHaveLength(10)

				const actualSegments = emitFake.mock.calls[0][2].segments
				expect(actualSegments).toHaveLength(expectedSegments.length)

				expect(actualSegments[0]).toMatchObject(expectedSegments[0])
				expect(actualSegments[1]).toMatchObject(expectedSegments[1])
				expect(actualSegments[2]).toMatchObject(expectedSegments[2])
				expect(actualSegments[3]).toMatchObject(expectedSegments[3])
				expect(actualSegments[4]).toMatchObject(expectedSegments[4])
				expect(actualSegments[5]).toMatchObject(expectedSegments[5])
				expect(actualSegments[6]).toMatchObject(expectedSegments[6])
				expect(actualSegments[7]).toMatchObject(expectedSegments[7])
				expect(actualSegments[8]).toMatchObject(expectedSegments[8])
				expect(actualSegments[9]).toMatchObject(expectedSegments[9])

				expect(emitFake).toHaveBeenCalledTimes(3)
				expect(emitFake).toHaveBeenNthCalledWith(1, 'rundown_metadata_update', expect.any(String), expect.any(Object))
				expect(emitFake).toHaveBeenNthCalledWith(
					2,
					'segment_update',
					expect.any(String),
					mockData.rawSegments[1].identifier,
					expect.objectContaining({
						payload: expect.objectContaining({
							segmentType: 'Economy',
							isStartOfNewSegmentType: true,
						}),
					})
				)
				expect(emitFake).toHaveBeenNthCalledWith(
					3,
					'segment_update',
					expect.any(String),
					mockData.rawSegments[2].identifier,
					expect.objectContaining({
						payload: expect.objectContaining({
							segmentType: 'Economy',
							isStartOfNewSegmentType: false,
						}),
					})
				)
			})

			it('cascades updates to segmentType and isStartOfNewSegmentType when a segment goes from having a segment type to not having one', async () => {
				// Simulate changes to the mock data
				mockData.rawSegments[8].fields.vType = ''
				mockData.rawSegments[8].fields.modifyDate = Math.floor(Date.now() / 1000).toString()
				mockData.rawSegments[8].locator = '11111111:22222222'
				mockData.rawSegments[8].id = `${mockData.rawSegments[8].identifier}:${mockData.rawSegments[8].locator}`

				await testee.checkINewsRundownById(mockData.queueName)

				const expectedSegments = [
					{
						payload: expect.objectContaining({
							segmentType: 'News',
							isStartOfNewSegmentType: true,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'News',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'News',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: true,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
				]

				expect(expectedSegments).toHaveLength(10)

				const actualSegments = emitFake.mock.calls[0][2].segments
				expect(actualSegments).toHaveLength(expectedSegments.length)

				expect(actualSegments[0]).toMatchObject(expectedSegments[0])
				expect(actualSegments[1]).toMatchObject(expectedSegments[1])
				expect(actualSegments[2]).toMatchObject(expectedSegments[2])
				expect(actualSegments[3]).toMatchObject(expectedSegments[3])
				expect(actualSegments[4]).toMatchObject(expectedSegments[4])
				expect(actualSegments[5]).toMatchObject(expectedSegments[5])
				expect(actualSegments[6]).toMatchObject(expectedSegments[6])
				expect(actualSegments[7]).toMatchObject(expectedSegments[7])
				expect(actualSegments[8]).toMatchObject(expectedSegments[8])
				expect(actualSegments[9]).toMatchObject(expectedSegments[9])

				expect(emitFake).toHaveBeenCalledTimes(3)
				expect(emitFake).toHaveBeenNthCalledWith(1, 'rundown_metadata_update', expect.any(String), expect.any(Object))
				expect(emitFake).toHaveBeenNthCalledWith(
					2,
					'segment_update',
					expect.any(String),
					mockData.rawSegments[8].identifier,
					expect.objectContaining({
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					})
				)
				expect(emitFake).toHaveBeenNthCalledWith(
					3,
					'segment_update',
					expect.any(String),
					mockData.rawSegments[9].identifier,
					expect.objectContaining({
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					})
				)
			})

			it('when moving a story with an empty vType, a new value is properly inferred from previous stories', async () => {
				// Simulate changes to the mock data
				const indexToMove = 9
				const indexToInsertAt = 1
				mockData.rawSegments[indexToMove].fields.modifyDate = Math.floor(Date.now() / 1000).toString()
				mockData.rawSegments[indexToMove].locator = '11111111:22222222'
				mockData.rawSegments[
					indexToMove
				].id = `${mockData.rawSegments[indexToMove].identifier}:${mockData.rawSegments[indexToMove].locator}`
				for (const arr of [mockData.dirList, mockData.rawSegments, mockData.segmentExternalIds]) {
					const [item] = arr.splice(indexToMove, 1)
					arr.splice(indexToInsertAt, 0, item as any)
				}

				await testee.checkINewsRundownById(mockData.queueName)

				const expectedSegments = [
					{
						payload: expect.objectContaining({
							segmentType: 'News',
							isStartOfNewSegmentType: true,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'News',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'News',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'News',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: true,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Weather',
							isStartOfNewSegmentType: true,
						}),
					},
				]

				expect(expectedSegments).toHaveLength(10)

				const actualSegments = emitFake.mock.calls[0][2].segments
				expect(actualSegments).toHaveLength(expectedSegments.length)

				expect(actualSegments[0]).toMatchObject(expectedSegments[0])
				expect(actualSegments[1]).toMatchObject(expectedSegments[1])
				expect(actualSegments[2]).toMatchObject(expectedSegments[2])
				expect(actualSegments[3]).toMatchObject(expectedSegments[3])
				expect(actualSegments[4]).toMatchObject(expectedSegments[4])
				expect(actualSegments[5]).toMatchObject(expectedSegments[5])
				expect(actualSegments[6]).toMatchObject(expectedSegments[6])
				expect(actualSegments[7]).toMatchObject(expectedSegments[7])
				expect(actualSegments[8]).toMatchObject(expectedSegments[8])
				expect(actualSegments[9]).toMatchObject(expectedSegments[9])

				expect(emitFake).toHaveBeenCalledTimes(3)
				expect(emitFake).toHaveBeenNthCalledWith(1, 'rundown_metadata_update', expect.any(String), expect.any(Object))
				expect(emitFake).toHaveBeenNthCalledWith(
					2,
					'segment_update',
					expect.any(String),
					mockData.rawSegments[indexToInsertAt].identifier,
					expect.objectContaining({
						payload: expect.objectContaining({
							segmentType: 'News',
							isStartOfNewSegmentType: false,
						}),
					})
				)
				expect(emitFake).toHaveBeenNthCalledWith(3, 'segment_ranks_update', expect.any(String), expect.any(Object))
			})

			it('when moving a story with a vType, its value is cascaded to subsequent stories without any vType', async () => {
				// Simulate changes to the mock data
				const indexToMove = 8
				const indexToInsertAt = 2
				mockData.rawSegments[indexToMove].fields.modifyDate = Math.floor(Date.now() / 1000).toString()
				mockData.rawSegments[indexToMove].locator = '11111111:22222222'
				mockData.rawSegments[
					indexToMove
				].id = `${mockData.rawSegments[indexToMove].identifier}:${mockData.rawSegments[indexToMove].locator}`
				for (const arr of [mockData.dirList, mockData.rawSegments, mockData.segmentExternalIds]) {
					const [item] = arr.splice(indexToMove, 1)
					arr.splice(indexToInsertAt, 0, item as any)
				}

				await testee.checkINewsRundownById(mockData.queueName)

				const expectedSegments = [
					{
						payload: expect.objectContaining({
							segmentType: 'News',
							isStartOfNewSegmentType: true,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'News',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Weather',
							isStartOfNewSegmentType: true,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Weather',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: true,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
				]

				expect(expectedSegments).toHaveLength(10)

				const actualSegments = emitFake.mock.calls[0][2].segments
				expect(actualSegments).toHaveLength(expectedSegments.length)

				expect(actualSegments[0]).toMatchObject(expectedSegments[0])
				expect(actualSegments[1]).toMatchObject(expectedSegments[1])
				expect(actualSegments[2]).toMatchObject(expectedSegments[2])
				expect(actualSegments[3]).toMatchObject(expectedSegments[3])
				expect(actualSegments[4]).toMatchObject(expectedSegments[4])
				expect(actualSegments[5]).toMatchObject(expectedSegments[5])
				expect(actualSegments[6]).toMatchObject(expectedSegments[6])
				expect(actualSegments[7]).toMatchObject(expectedSegments[7])
				expect(actualSegments[8]).toMatchObject(expectedSegments[8])
				expect(actualSegments[9]).toMatchObject(expectedSegments[9])

				expect(emitFake).toHaveBeenCalledTimes(4)
				expect(emitFake).toHaveBeenNthCalledWith(1, 'rundown_metadata_update', expect.any(String), expect.any(Object))
				expect(emitFake).toHaveBeenNthCalledWith(
					2,
					'segment_update',
					expect.any(String),
					mockData.rawSegments[indexToInsertAt + 1].identifier,
					expect.objectContaining({
						payload: expect.objectContaining({
							segmentType: 'Weather',
							isStartOfNewSegmentType: false,
						}),
					})
				)
				expect(emitFake).toHaveBeenNthCalledWith(
					3,
					'segment_update',
					expect.any(String),
					mockData.rawSegments[9].identifier,
					expect.objectContaining({
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					})
				)
				expect(emitFake).toHaveBeenNthCalledWith(4, 'segment_ranks_update', expect.any(String), expect.any(Object))
			})

			it('updates vTypes when a segment is deleted', async () => {
				// Simulate changes to the mock data
				const indexToDelete = 8
				const deletedIdentifier = mockData.segmentExternalIds[indexToDelete]
				for (const arr of [mockData.dirList, mockData.rawSegments, mockData.segmentExternalIds]) {
					arr.splice(indexToDelete, 1)
				}

				await testee.checkINewsRundownById(mockData.queueName)

				const expectedSegments = [
					{
						payload: expect.objectContaining({
							segmentType: 'News',
							isStartOfNewSegmentType: true,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'News',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'News',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: true,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
				]

				expect(expectedSegments).toHaveLength(9)

				const actualSegments = emitFake.mock.calls[1][2].segments
				expect(actualSegments).toHaveLength(expectedSegments.length)

				expect(actualSegments[0]).toMatchObject(expectedSegments[0])
				expect(actualSegments[1]).toMatchObject(expectedSegments[1])
				expect(actualSegments[2]).toMatchObject(expectedSegments[2])
				expect(actualSegments[3]).toMatchObject(expectedSegments[3])
				expect(actualSegments[4]).toMatchObject(expectedSegments[4])
				expect(actualSegments[5]).toMatchObject(expectedSegments[5])
				expect(actualSegments[6]).toMatchObject(expectedSegments[6])
				expect(actualSegments[7]).toMatchObject(expectedSegments[7])
				expect(actualSegments[8]).toMatchObject(expectedSegments[8])

				expect(emitFake).toHaveBeenCalledTimes(4)
				expect(emitFake).toHaveBeenNthCalledWith(1, 'segment_delete', expect.any(String), deletedIdentifier)
				expect(emitFake).toHaveBeenNthCalledWith(2, 'rundown_metadata_update', expect.any(String), expect.any(Object))
				expect(emitFake).toHaveBeenNthCalledWith(
					3,
					'segment_update',
					expect.any(String),
					mockData.rawSegments[8].identifier,
					expect.objectContaining({
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					})
				)
				expect(emitFake).toHaveBeenNthCalledWith(4, 'segment_ranks_update', expect.any(String), expect.any(Object))
			})

			it('updates vTypes when a segment is added', async () => {
				// Simulate changes to the mock data
				const indexToInsertAt = 1
				const identifier = '00000000'
				const locator = '11111111:22222222'
				mockData.dirList.splice(
					indexToInsertAt,
					0,
					literal<INewsFile>({
						filetype: 'file',
						file: `${identifier}:${locator}`,
						identifier,
						locator,
						storyName: '',
						modified: new Date('2023-02-16T20:37:00.000Z'),
					})
				)
				mockData.rawSegments.splice(
					indexToInsertAt,
					0,
					literal<INewsStoryGW>({
						fields: {
							vType: 'Added',
							audioTime: '0',
							totalTime: '146',
							modifyDate: '1676580420',
						},
						meta: {},
						cues: [],
						id: `${identifier}:${locator}`,
						body: '<p><cc></cc></p>',
						identifier,
						locator,
					})
				)
				mockData.segmentExternalIds.splice(indexToInsertAt, 0, identifier)

				await testee.checkINewsRundownById(mockData.queueName)

				const expectedSegments = [
					{
						payload: expect.objectContaining({
							segmentType: 'News',
							isStartOfNewSegmentType: true,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Added',
							isStartOfNewSegmentType: true,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Added',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Added',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: true,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Sport',
							isStartOfNewSegmentType: false,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Weather',
							isStartOfNewSegmentType: true,
						}),
					},
					{
						payload: expect.objectContaining({
							segmentType: 'Weather',
							isStartOfNewSegmentType: false,
						}),
					},
				]

				expect(expectedSegments).toHaveLength(11)

				const actualSegments = emitFake.mock.calls[0][2].segments
				expect(actualSegments).toHaveLength(expectedSegments.length)

				expect(actualSegments[0]).toMatchObject(expectedSegments[0])
				expect(actualSegments[1]).toMatchObject(expectedSegments[1])
				expect(actualSegments[2]).toMatchObject(expectedSegments[2])
				expect(actualSegments[3]).toMatchObject(expectedSegments[3])
				expect(actualSegments[4]).toMatchObject(expectedSegments[4])
				expect(actualSegments[5]).toMatchObject(expectedSegments[5])
				expect(actualSegments[6]).toMatchObject(expectedSegments[6])
				expect(actualSegments[7]).toMatchObject(expectedSegments[7])
				expect(actualSegments[8]).toMatchObject(expectedSegments[8])
				expect(actualSegments[9]).toMatchObject(expectedSegments[9])
				expect(actualSegments[10]).toMatchObject(expectedSegments[10])

				expect(emitFake).toHaveBeenCalledTimes(5)
				expect(emitFake).toHaveBeenNthCalledWith(1, 'rundown_metadata_update', expect.any(String), expect.any(Object))
				expect(emitFake).toHaveBeenNthCalledWith(
					2,
					'segment_update',
					expect.any(String),
					mockData.rawSegments[indexToInsertAt + 1].identifier,
					expect.objectContaining({
						payload: expect.objectContaining({
							segmentType: 'Added',
							isStartOfNewSegmentType: false,
						}),
					})
				)
				expect(emitFake).toHaveBeenNthCalledWith(
					3,
					'segment_update',
					expect.any(String),
					mockData.rawSegments[indexToInsertAt + 2].identifier,
					expect.objectContaining({
						payload: expect.objectContaining({
							segmentType: 'Added',
							isStartOfNewSegmentType: false,
						}),
					})
				)
				expect(emitFake).toHaveBeenNthCalledWith(
					4,
					'segment_create',
					expect.any(String),
					identifier,
					expect.objectContaining({
						payload: expect.objectContaining({
							segmentType: 'Added',
							isStartOfNewSegmentType: true,
						}),
					})
				)
				expect(emitFake).toHaveBeenNthCalledWith(5, 'segment_ranks_update', expect.any(String), expect.any(Object))
			})
		})
	})
})
