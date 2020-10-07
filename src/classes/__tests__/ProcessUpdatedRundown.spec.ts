import { ProcessUpdatedRundown } from '../ProcessUpdatedRundown'
import { INewsRundown } from '../datastructures/Rundown'
import { RundownMap, RundownChangeRundownCreate, RundownChangeType, RundownChange, RundownChangeRundownDelete, RundownChangeRundownUpdate, RundownChangeSegmentCreate, RundownChangeSegmentDelete, RundownChangeSegmentUpdate } from '../RundownWatcher'
import { literal } from '../../helpers'
import { RundownSegment, INewsStoryGW } from '../datastructures/Segment'
import * as _ from 'underscore'
import { segmentGW01, RundownSegmentFromMockSegment, segmentGW02, segmentGW03, segmentGW04, segmentGW05, segmentGW06, segmentGW07, segmentGW08 } from './__mocks__/mockSegments'

const TEST_RUNDOWN_ID = 'INEWS.RUNDOWN.TEST'
const TEST_RUNDOWN: INewsRundown = new INewsRundown(
	TEST_RUNDOWN_ID,
	'TEST RUNDOWN',
	'v0.0',
	[]
)

function addSegmentsToTestRundown (segments: RundownSegment[]): INewsRundown {
	return new INewsRundown(TEST_RUNDOWN.externalId, TEST_RUNDOWN.name, TEST_RUNDOWN.gatewayVersion, segments)
}

function replaceSegmentsInRundown (segments: RundownSegment[], rundown: INewsRundown): INewsRundown {
	rundown.segments = rundown.segments.filter(s => !segments.some(segment => segment.externalId === s.externalId))
	rundown.segments.push(...segments)
	return rundown
}

describe('Process Updated Rundown', () => {
	it('Emits RUNDOWN_CREATE when a rundown did not previously exist', () => {
		const rundownMap: RundownMap = new Map()

		const result = ProcessUpdatedRundown(TEST_RUNDOWN_ID, TEST_RUNDOWN, rundownMap)

		expect(result).toEqual(
			literal<RundownChange[]>([
				literal<RundownChangeRundownCreate>({
					type: RundownChangeType.RUNDOWN_CREATE,
					rundownExternalId: TEST_RUNDOWN_ID
				})
			])
		)
	})

	it('Emits RUNDOWN_DELETE when a rundown is removed', () => {
		const rundownMap: RundownMap = new Map()
		rundownMap.set(TEST_RUNDOWN_ID, TEST_RUNDOWN)

		const result = ProcessUpdatedRundown(TEST_RUNDOWN_ID, null, rundownMap)

		expect(result).toEqual(
			literal<RundownChange[]>([
				literal<RundownChangeRundownDelete>({
					type: RundownChangeType.RUNDOWN_DELETE,
					rundownExternalId: TEST_RUNDOWN_ID
				})
			])
		)
	})

	it('Emits RUNDOWN_UPDATE when a property of the rundown is changed', () => {
		const rundownMap: RundownMap = new Map()
		rundownMap.set(TEST_RUNDOWN_ID, TEST_RUNDOWN)

		const changedRundown = new INewsRundown(
			TEST_RUNDOWN_ID,
			'CHANGED RUNDOWN',
			'v0.0',
			[]
		)

		const result = ProcessUpdatedRundown(TEST_RUNDOWN_ID, changedRundown, rundownMap)

		expect(result).toEqual(
			literal<RundownChange[]>([
				literal<RundownChangeRundownUpdate>({
					type: RundownChangeType.RUNDOWN_UPDATE,
					rundownExternalId: TEST_RUNDOWN_ID
				})
			])
		)
	})

	it('Emits SEGMENT_CREATE when a segment did not previously exist', () => {
		const rundownMap: RundownMap = new Map()
		rundownMap.set(TEST_RUNDOWN_ID, TEST_RUNDOWN)

		const newSegment: RundownSegment = new RundownSegment(TEST_RUNDOWN_ID, segmentGW01, '0', 'segment-01', 0, 'TEST SEGMENT', false)
		const updatedRundown = new INewsRundown(TEST_RUNDOWN.externalId, TEST_RUNDOWN.name, TEST_RUNDOWN.gatewayVersion, [newSegment])

		const result = ProcessUpdatedRundown(TEST_RUNDOWN_ID, updatedRundown, rundownMap)

		expect(result).toEqual(
			literal<RundownChange[]>([
				literal<RundownChangeSegmentCreate>({
					type: RundownChangeType.SEGMENT_CREATE,
					rundownExternalId: TEST_RUNDOWN_ID,
					segmentExternalId: 'segment-01'
				})
			])
		)
	})

	it('Emits SEGMENT_DELETE when a segment is removed', () => {
		const rundownMap: RundownMap = new Map()

		const newSegment: RundownSegment = RundownSegmentFromMockSegment(TEST_RUNDOWN_ID, segmentGW01)
		const rundown = addSegmentsToTestRundown([newSegment])
		rundownMap.set(TEST_RUNDOWN_ID, rundown)

		const result = ProcessUpdatedRundown(TEST_RUNDOWN_ID, TEST_RUNDOWN, rundownMap)

		expect(result).toEqual(
			literal<RundownChange[]>([
				literal<RundownChangeSegmentDelete>({
					type: RundownChangeType.SEGMENT_DELETE,
					rundownExternalId: TEST_RUNDOWN_ID,
					segmentExternalId: 'segment-01'
				})
			])
		)
	})

	it('Emits SEGMENT_UPDATE when a property of a segment is changed', () => {
		const rundownMap: RundownMap = new Map()

		const existingSegment: RundownSegment = RundownSegmentFromMockSegment(TEST_RUNDOWN_ID, segmentGW01)
		const rundown = addSegmentsToTestRundown([existingSegment])
		rundownMap.set(TEST_RUNDOWN_ID, rundown)

		const changedSegment: RundownSegment = RundownSegmentFromMockSegment(TEST_RUNDOWN_ID, segmentGW01)
		changedSegment.name = 'A New Name'
		const updatedRundown = addSegmentsToTestRundown([changedSegment])

		const result = ProcessUpdatedRundown(TEST_RUNDOWN_ID, updatedRundown, rundownMap)

		expect(result).toEqual(
			literal<RundownChange[]>([
				literal<RundownChangeSegmentUpdate>({
					type: RundownChangeType.SEGMENT_UPDATE,
					rundownExternalId: TEST_RUNDOWN_ID,
					segmentExternalId: 'segment-01'
				})
			])
		)
	})

	it('Emits SEGMENT_UPDATE when a segment has been moved', () => {
		const rundownMap: RundownMap = new Map()

		const previousSegments: INewsStoryGW[] = [
			segmentGW01, segmentGW02, segmentGW03, segmentGW04, segmentGW05, segmentGW06
		]
		const previousRundownSegments: RundownSegment[] = []

		previousSegments.forEach((mockSegment, rank) => {
			const newSegment = RundownSegmentFromMockSegment(TEST_RUNDOWN_ID, mockSegment)
			newSegment.rank = rank
			previousRundownSegments.push(newSegment)
		})

		const rundown = addSegmentsToTestRundown(previousRundownSegments)
		rundownMap.set(TEST_RUNDOWN_ID, rundown)

		const newSegments: INewsStoryGW[] = [
			segmentGW01, segmentGW02, segmentGW03, segmentGW05, segmentGW06, segmentGW04
		]
		const newRanks: {[id: string]: number} = {
			'segment-01': 0,
			'segment-02': 1,
			'segment-03': 2,
			'segment-04': 6,
			'segment-05': 4,
			'segment-06': 5
		}
		const newRundownSegments: RundownSegment[] = []

		newSegments.forEach((mockSegment) => {
			const newSegment = RundownSegmentFromMockSegment(TEST_RUNDOWN_ID, mockSegment)
			newSegment.rank = newRanks[mockSegment.identifier]
			newRundownSegments.push(newSegment)
		})

		const updatedRundown = addSegmentsToTestRundown(newRundownSegments)

		const result = ProcessUpdatedRundown(TEST_RUNDOWN_ID, updatedRundown, rundownMap)

		expect(result).toEqual(
			literal<RundownChange[]>([
				literal<RundownChangeSegmentUpdate>({
					type: RundownChangeType.SEGMENT_UPDATE,
					rundownExternalId: TEST_RUNDOWN_ID,
					segmentExternalId: 'segment-04'
				})
			])
		)
	})

	it('Emits SEGMENT_UPDATE only for changed segments', () => {
		const rundownMap: RundownMap = new Map()

		const mockSegments: INewsStoryGW[] = [
			segmentGW01, segmentGW02, segmentGW03, segmentGW04, segmentGW05, segmentGW06
		]
		const mockRundownSegments: RundownSegment[] = []

		mockSegments.forEach(mockSegment => {
			mockRundownSegments.push(RundownSegmentFromMockSegment(TEST_RUNDOWN_ID, mockSegment))
		})

		const rundown = addSegmentsToTestRundown(mockRundownSegments)
		rundownMap.set(TEST_RUNDOWN_ID, rundown)

		const changedSegment1: RundownSegment = RundownSegmentFromMockSegment(TEST_RUNDOWN_ID, segmentGW01)
		changedSegment1.name = 'A New Name'
		const changedSegment2: RundownSegment = RundownSegmentFromMockSegment(TEST_RUNDOWN_ID, segmentGW05)
		changedSegment2.iNewsStory.body = 'Some body'
		const changedSegment3: RundownSegment = RundownSegmentFromMockSegment(TEST_RUNDOWN_ID, segmentGW06)
		changedSegment3.iNewsStory.cues = [['CUE TEXT']]
		const updatedRundown = replaceSegmentsInRundown([changedSegment1, changedSegment2, changedSegment3], addSegmentsToTestRundown(mockRundownSegments))

		const result = ProcessUpdatedRundown(TEST_RUNDOWN_ID, updatedRundown, rundownMap)

		expect(result).toEqual(
			literal<RundownChange[]>([
				literal<RundownChangeSegmentUpdate>({
					type: RundownChangeType.SEGMENT_UPDATE,
					rundownExternalId: TEST_RUNDOWN_ID,
					segmentExternalId: 'segment-01'
				}),
				literal<RundownChangeSegmentUpdate>({
					type: RundownChangeType.SEGMENT_UPDATE,
					rundownExternalId: TEST_RUNDOWN_ID,
					segmentExternalId: 'segment-05'
				}),
				literal<RundownChangeSegmentUpdate>({
					type: RundownChangeType.SEGMENT_UPDATE,
					rundownExternalId: TEST_RUNDOWN_ID,
					segmentExternalId: 'segment-06'
				})
			])
		)
	})

	it('Emits SEGMENT_DELETE only for deleted segments', () => {
		const rundownMap: RundownMap = new Map()

		const previousSegments: INewsStoryGW[] = [
			segmentGW01, segmentGW02, segmentGW03, segmentGW04, segmentGW05, segmentGW06
		]
		const previousRundownSegments: RundownSegment[] = []

		previousSegments.forEach(mockSegment => {
			previousRundownSegments.push(RundownSegmentFromMockSegment(TEST_RUNDOWN_ID, mockSegment))
		})

		const rundown = addSegmentsToTestRundown(previousRundownSegments)
		rundownMap.set(TEST_RUNDOWN_ID, rundown)

		const newSegments: INewsStoryGW[] = [
			segmentGW02, segmentGW03, segmentGW05, segmentGW06
		]
		const newRundownSegments: RundownSegment[] = []

		newSegments.forEach(mockSegment => {
			newRundownSegments.push(RundownSegmentFromMockSegment(TEST_RUNDOWN_ID, mockSegment))
		})

		const updatedRundown = addSegmentsToTestRundown(newRundownSegments)

		const result = ProcessUpdatedRundown(TEST_RUNDOWN_ID, updatedRundown, rundownMap)

		expect(result).toEqual([
			literal<RundownChangeSegmentDelete>({
				type: RundownChangeType.SEGMENT_DELETE,
				rundownExternalId: TEST_RUNDOWN_ID,
				segmentExternalId: 'segment-01'
			}),
			literal<RundownChangeSegmentDelete>({
				type: RundownChangeType.SEGMENT_DELETE,
				rundownExternalId: TEST_RUNDOWN_ID,
				segmentExternalId: 'segment-04'
			})
		])
	})

	it('Emits SEGMENT_DELETE, SEGMENT_UPDATE, and SEGMENT_CREATE in combination', () => {
		const rundownMap: RundownMap = new Map()

		const previousSegments: INewsStoryGW[] = [
			segmentGW01, segmentGW02, segmentGW03, segmentGW04, segmentGW05, segmentGW06
		]
		const previousRundownSegments: RundownSegment[] = []

		previousSegments.forEach(mockSegment => {
			previousRundownSegments.push(RundownSegmentFromMockSegment(TEST_RUNDOWN_ID, mockSegment))
		})

		const rundown = addSegmentsToTestRundown(previousRundownSegments)
		rundownMap.set(TEST_RUNDOWN_ID, rundown)

		const newSegments: INewsStoryGW[] = [
			segmentGW02, segmentGW03, segmentGW08, segmentGW05, { ...segmentGW06, fields: { title: 'Changed Segment' } }, segmentGW07
		]
		const newRundownSegments: RundownSegment[] = []

		newSegments.forEach(mockSegment => {
			newRundownSegments.push(RundownSegmentFromMockSegment(TEST_RUNDOWN_ID, mockSegment))
		})

		const updatedRundown = addSegmentsToTestRundown(newRundownSegments)

		const result = ProcessUpdatedRundown(TEST_RUNDOWN_ID, updatedRundown, rundownMap)

		expect(result).toEqual([
			literal<RundownChangeSegmentCreate>({
				type: RundownChangeType.SEGMENT_CREATE,
				rundownExternalId: TEST_RUNDOWN_ID,
				segmentExternalId: 'segment-08'
			}),
			literal<RundownChangeSegmentUpdate>({
				type: RundownChangeType.SEGMENT_UPDATE,
				rundownExternalId: TEST_RUNDOWN_ID,
				segmentExternalId: 'segment-06'
			}),
			literal<RundownChangeSegmentCreate>({
				type: RundownChangeType.SEGMENT_CREATE,
				rundownExternalId: TEST_RUNDOWN_ID,
				segmentExternalId: 'segment-07'
			}),
			literal<RundownChangeSegmentDelete>({
				type: RundownChangeType.SEGMENT_DELETE,
				rundownExternalId: TEST_RUNDOWN_ID,
				segmentExternalId: 'segment-01'
			}),
			literal<RundownChangeSegmentDelete>({
				type: RundownChangeType.SEGMENT_DELETE,
				rundownExternalId: TEST_RUNDOWN_ID,
				segmentExternalId: 'segment-04'
			})
		])
	})
})
