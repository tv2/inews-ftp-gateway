import {
	DiffPlaylist,
	PlaylistChangeRundownCreated,
	PlaylistChangeRundownMetaDataUpdated,
	PlaylistChangeSegmentCreated,
	PlaylistChangeSegmentDeleted,
	PlaylistChangeSegmentMoved,
	PlaylistChangeType,
} from '../DiffPlaylist'
import { INewsRundown } from '../../classes/datastructures/Rundown'
import { SegmentId } from '../id'
import { RundownSegment } from '../../classes/datastructures/Segment'
import { literal } from '../../helpers'
import { INewsStory, INewsFields } from 'inews'

function makeINewsRundown(
	rundownId: string,
	segmentIds: Array<{ _id: SegmentId; backTime?: string }>,
	payload?: { [key: string]: any }
): INewsRundown {
	const segments = segmentIds.map(
		(segment, i) =>
			new RundownSegment(
				rundownId,
				makeINewsStory(segment._id, segment.backTime),
				new Date(0),
				'',
				segment._id,
				i,
				segment._id,
				false
			)
	)

	const rundown = new INewsRundown(rundownId, rundownId, 'v0.0', segments, payload)

	return rundown
}

function makeINewsStory(id: string, backTime?: string) {
	return literal<INewsStory>({
		id,
		identifier: id,
		locator: '',
		fields: literal<INewsFields>({
			title: '',
			modifyDate: '',
			tapeTime: '',
			audioTime: '',
			totalTime: '',
			cumeTime: '',
			backTime,
		}),
		meta: {},
		cues: [],
		body: '',
	})
}

describe('DiffPlaylist', () => {
	it('Reports no change', () => {
		let newPlaylist = makeINewsRundown('test-rundown_1', [
			{
				_id: 'segment-01',
			},
			{
				_id: 'segment-02',
			},
			{
				_id: 'segment-03',
			},
		])

		let result = DiffPlaylist(newPlaylist, newPlaylist)

		expect(result.playlistChanges).toEqual([])
		expect(result.segmentChanges).toEqual({
			movedSegments: [],
			notMovedSegments: ['segment-01', 'segment-02', 'segment-03'],
			insertedSegments: [],
			deletedSegments: [],
			changedSegments: [],
		})
	})

	it('Reports segments moved within rundown', () => {
		let newPlaylist = makeINewsRundown('test-rundown_1', [
			{
				_id: 'segment-01',
			},
			{
				_id: 'segment-02',
			},
			{
				_id: 'segment-03',
			},
			{
				_id: 'segment-04',
			},
			{
				_id: 'segment-05',
			},
			{
				_id: 'segment-06',
			},
		])

		let prevPlaylist = makeINewsRundown('test-rundown_1', [
			{
				_id: 'segment-02',
			},
			{
				_id: 'segment-01',
			},
			{
				_id: 'segment-03',
			},
			{
				_id: 'segment-04',
			},
			{
				_id: 'segment-06',
			},
			{
				_id: 'segment-05',
			},
		])

		let result = DiffPlaylist(newPlaylist, prevPlaylist)

		expect(result.playlistChanges).toEqual([
			literal<PlaylistChangeSegmentMoved>({
				type: PlaylistChangeType.PlaylistChangeSegmentMoved,
				rundownExternalId: 'test-rundown_1',
				segmentExternalId: 'segment-01',
			}),
			literal<PlaylistChangeSegmentMoved>({
				type: PlaylistChangeType.PlaylistChangeSegmentMoved,
				rundownExternalId: 'test-rundown_1',
				segmentExternalId: 'segment-06',
			}),
			literal<PlaylistChangeRundownMetaDataUpdated>({
				type: PlaylistChangeType.PlaylistChangeRundownMetaDataUpdated,
				rundownExternalId: 'test-rundown_1',
			}),
		])
		expect(result.segmentChanges).toEqual({
			movedSegments: ['segment-01', 'segment-06'],
			notMovedSegments: ['segment-02', 'segment-03', 'segment-04', 'segment-05'],
			insertedSegments: [],
			deletedSegments: [],
			changedSegments: [],
		})
	})

	it('Reports created rundown', () => {
		let prevPlaylist = undefined

		let newPlaylist = makeINewsRundown('test-rundown_1', [
			{
				_id: 'segment-01',
			},
			{
				_id: 'segment-02',
			},
			{
				_id: 'segment-03',
			},
		])

		let result = DiffPlaylist(newPlaylist, prevPlaylist)

		expect(result.playlistChanges).toEqual([
			literal<PlaylistChangeRundownCreated>({
				type: PlaylistChangeType.PlaylistChangeRundownCreated,
				rundownExternalId: 'test-rundown_1',
			}),
		])
		expect(result.segmentChanges).toEqual({
			movedSegments: [],
			notMovedSegments: [],
			insertedSegments: ['segment-01', 'segment-02', 'segment-03'],
			deletedSegments: [],
			changedSegments: [],
		})
	})

	it('Reports created segment', () => {
		let prevPlaylist = makeINewsRundown('test-rundown_1', [
			{
				_id: 'segment-01',
			},
			{
				_id: 'segment-03',
			},
			{
				_id: 'segment-05',
			},
			{
				_id: 'segment-06',
			},
		])

		let newPlaylist = makeINewsRundown('test-rundown_1', [
			{
				_id: 'segment-01',
			},
			{
				_id: 'segment-02',
			},
			{
				_id: 'segment-03',
			},
			{
				_id: 'segment-04',
			},
			{
				_id: 'segment-05',
			},
			{
				_id: 'segment-06',
			},
		])

		let result = DiffPlaylist(newPlaylist, prevPlaylist)

		expect(result.playlistChanges).toEqual([
			literal<PlaylistChangeSegmentCreated>({
				type: PlaylistChangeType.PlaylistChangeSegmentCreated,
				rundownExternalId: 'test-rundown_1',
				segmentExternalId: 'segment-02',
			}),
			literal<PlaylistChangeSegmentCreated>({
				type: PlaylistChangeType.PlaylistChangeSegmentCreated,
				rundownExternalId: 'test-rundown_1',
				segmentExternalId: 'segment-04',
			}),
			literal<PlaylistChangeRundownMetaDataUpdated>({
				type: PlaylistChangeType.PlaylistChangeRundownMetaDataUpdated,
				rundownExternalId: 'test-rundown_1',
			}),
		])
		expect(result.segmentChanges).toEqual({
			movedSegments: [],
			notMovedSegments: ['segment-01', 'segment-03', 'segment-05', 'segment-06'],
			insertedSegments: ['segment-02', 'segment-04'],
			deletedSegments: [],
			changedSegments: [],
		})
	})

	it('Reports deleted segment', () => {
		let prevPlaylist = makeINewsRundown('test-rundown_1', [
			{
				_id: 'segment-01',
			},
			{
				_id: 'segment-02',
			},
			{
				_id: 'segment-03',
			},
			{
				_id: 'segment-04',
			},
			{
				_id: 'segment-05',
			},
			{
				_id: 'segment-06',
			},
		])

		let newPlaylist = makeINewsRundown('test-rundown_1', [
			{
				_id: 'segment-01',
			},
			{
				_id: 'segment-03',
			},
			{
				_id: 'segment-05',
			},
			{
				_id: 'segment-06',
			},
		])

		let result = DiffPlaylist(newPlaylist, prevPlaylist)

		expect(result.playlistChanges).toEqual([
			literal<PlaylistChangeSegmentDeleted>({
				type: PlaylistChangeType.PlaylistChangeSegmentDeleted,
				rundownExternalId: 'test-rundown_1',
				segmentExternalId: 'segment-02',
			}),
			literal<PlaylistChangeSegmentDeleted>({
				type: PlaylistChangeType.PlaylistChangeSegmentDeleted,
				rundownExternalId: 'test-rundown_1',
				segmentExternalId: 'segment-04',
			}),
			literal<PlaylistChangeRundownMetaDataUpdated>({
				type: PlaylistChangeType.PlaylistChangeRundownMetaDataUpdated,
				rundownExternalId: 'test-rundown_1',
			}),
		])
		expect(result.segmentChanges).toEqual({
			movedSegments: [],
			notMovedSegments: ['segment-01', 'segment-03', 'segment-05', 'segment-06'],
			insertedSegments: [],
			deletedSegments: ['segment-02', 'segment-04'],
			changedSegments: [],
		})
	})
})
