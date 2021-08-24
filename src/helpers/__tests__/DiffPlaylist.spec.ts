import { literal } from '../../helpers'
import { ResolvedPlaylist, ResolvedPlaylistRundown } from '../ResolveRundownIntoPlaylist'
import {
	DiffPlaylist,
	PlaylistChangeRundownCreated,
	PlaylistChangeRundownDeleted,
	PlaylistChangeSegmentCreated,
	PlaylistChangeSegmentDeleted,
	PlaylistChangeSegmentMoved,
	PlaylistChangeType,
} from '../DiffPlaylist'

describe('DiffPlaylist', () => {
	it('Reports no change', () => {
		let newPlaylist: ResolvedPlaylist = [
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_1',
				segments: ['segment-01', 'segment-02', 'segment-03'],
			}),
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_2',
				segments: ['segment-04', 'segment-05', 'segment-06'],
			}),
		]

		let result = DiffPlaylist(newPlaylist, newPlaylist)

		expect(result.changes).toEqual([])
		expect(result.segmentChanges.get('test-rundown_1')).toEqual({
			movedSegments: [],
			notMovedSegments: ['segment-01', 'segment-02', 'segment-03'],
			insertedSegments: [],
			deletedSegments: [],
		})
		expect(result.segmentChanges.get('test-rundown_2')).toEqual({
			movedSegments: [],
			notMovedSegments: ['segment-04', 'segment-05', 'segment-06'],
			insertedSegments: [],
			deletedSegments: [],
		})
	})

	it('Reports segments moved within rundown', () => {
		let newPlaylist: ResolvedPlaylist = [
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_1',
				segments: ['segment-01', 'segment-02', 'segment-03'],
			}),
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_2',
				segments: ['segment-04', 'segment-05', 'segment-06'],
			}),
		]

		let prevPlaylist: ResolvedPlaylist = [
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_1',
				segments: ['segment-02', 'segment-01', 'segment-03'],
			}),
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_2',
				segments: ['segment-04', 'segment-06', 'segment-05'],
			}),
		]

		let result = DiffPlaylist(newPlaylist, prevPlaylist)

		expect(result.changes).toEqual([
			literal<PlaylistChangeSegmentMoved>({
				type: PlaylistChangeType.PlaylistChangeSegmentMoved,
				rundownExternalId: 'test-rundown_1',
				segmentExternalId: 'segment-01',
			}),
			literal<PlaylistChangeSegmentMoved>({
				type: PlaylistChangeType.PlaylistChangeSegmentMoved,
				rundownExternalId: 'test-rundown_2',
				segmentExternalId: 'segment-06',
			}),
		])
		expect(result.segmentChanges.get('test-rundown_1')).toEqual({
			movedSegments: ['segment-01'],
			notMovedSegments: ['segment-02', 'segment-03'],
			insertedSegments: [],
			deletedSegments: [],
		})
		expect(result.segmentChanges.get('test-rundown_2')).toEqual({
			movedSegments: ['segment-06'],
			notMovedSegments: ['segment-04', 'segment-05'],
			insertedSegments: [],
			deletedSegments: [],
		})
	})

	it('Reports deleted rundown', () => {
		let prevPlaylist: ResolvedPlaylist = [
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_1',
				segments: ['segment-01', 'segment-02', 'segment-03'],
			}),
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_2',
				segments: ['segment-04', 'segment-05', 'segment-06'],
			}),
		]

		let newPlaylist: ResolvedPlaylist = [
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_2',
				segments: ['segment-04', 'segment-05', 'segment-06'],
			}),
		]

		let result = DiffPlaylist(newPlaylist, prevPlaylist)

		expect(result.changes).toEqual([
			literal<PlaylistChangeRundownDeleted>({
				type: PlaylistChangeType.PlaylistChangeRundownDeleted,
				rundownExternalId: 'test-rundown_1',
			}),
		])
		expect(result.segmentChanges.get('test-rundown_1')).toEqual({
			movedSegments: [],
			notMovedSegments: [],
			insertedSegments: [],
			deletedSegments: ['segment-01', 'segment-02', 'segment-03'],
		})
		expect(result.segmentChanges.get('test-rundown_2')).toEqual({
			movedSegments: [],
			notMovedSegments: ['segment-04', 'segment-05', 'segment-06'],
			insertedSegments: [],
			deletedSegments: [],
		})
	})

	it('Reports created rundown', () => {
		let prevPlaylist: ResolvedPlaylist = [
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_2',
				segments: ['segment-04', 'segment-05', 'segment-06'],
			}),
		]

		let newPlaylist: ResolvedPlaylist = [
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_1',
				segments: ['segment-01', 'segment-02', 'segment-03'],
			}),
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_2',
				segments: ['segment-04', 'segment-05', 'segment-06'],
			}),
		]

		let result = DiffPlaylist(newPlaylist, prevPlaylist)

		expect(result.changes).toEqual([
			literal<PlaylistChangeRundownCreated>({
				type: PlaylistChangeType.PlaylistChangeRundownCreated,
				rundownExternalId: 'test-rundown_1',
			}),
		])
		expect(result.segmentChanges.get('test-rundown_1')).toEqual({
			movedSegments: [],
			notMovedSegments: [],
			insertedSegments: ['segment-01', 'segment-02', 'segment-03'],
			deletedSegments: [],
		})
		expect(result.segmentChanges.get('test-rundown_2')).toEqual({
			movedSegments: [],
			notMovedSegments: ['segment-04', 'segment-05', 'segment-06'],
			insertedSegments: [],
			deletedSegments: [],
		})
	})

	it('Reports created segment', () => {
		let prevPlaylist: ResolvedPlaylist = [
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_1',
				segments: ['segment-01', 'segment-03'],
			}),
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_2',
				segments: ['segment-05', 'segment-06'],
			}),
		]

		let newPlaylist: ResolvedPlaylist = [
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_1',
				segments: ['segment-01', 'segment-02', 'segment-03'],
			}),
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_2',
				segments: ['segment-04', 'segment-05', 'segment-06'],
			}),
		]

		let result = DiffPlaylist(newPlaylist, prevPlaylist)

		expect(result.changes).toEqual([
			literal<PlaylistChangeSegmentCreated>({
				type: PlaylistChangeType.PlaylistChangeSegmentCreated,
				rundownExternalId: 'test-rundown_1',
				segmentExternalId: 'segment-02',
			}),
			literal<PlaylistChangeSegmentCreated>({
				type: PlaylistChangeType.PlaylistChangeSegmentCreated,
				rundownExternalId: 'test-rundown_2',
				segmentExternalId: 'segment-04',
			}),
		])
		expect(result.segmentChanges.get('test-rundown_1')).toEqual({
			movedSegments: [],
			notMovedSegments: ['segment-01', 'segment-03'],
			insertedSegments: ['segment-02'],
			deletedSegments: [],
		})
		expect(result.segmentChanges.get('test-rundown_2')).toEqual({
			movedSegments: [],
			notMovedSegments: ['segment-05', 'segment-06'],
			insertedSegments: ['segment-04'],
			deletedSegments: [],
		})
	})

	it('Reports deleted segment', () => {
		let prevPlaylist: ResolvedPlaylist = [
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_1',
				segments: ['segment-01', 'segment-02', 'segment-03'],
			}),
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_2',
				segments: ['segment-04', 'segment-05', 'segment-06'],
			}),
		]

		let newPlaylist: ResolvedPlaylist = [
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_1',
				segments: ['segment-01', 'segment-03'],
			}),
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_2',
				segments: ['segment-05', 'segment-06'],
			}),
		]

		let result = DiffPlaylist(newPlaylist, prevPlaylist)

		expect(result.changes).toEqual([
			literal<PlaylistChangeSegmentDeleted>({
				type: PlaylistChangeType.PlaylistChangeSegmentDeleted,
				rundownExternalId: 'test-rundown_1',
				segmentExternalId: 'segment-02',
			}),
			literal<PlaylistChangeSegmentDeleted>({
				type: PlaylistChangeType.PlaylistChangeSegmentDeleted,
				rundownExternalId: 'test-rundown_2',
				segmentExternalId: 'segment-04',
			}),
		])
		expect(result.segmentChanges.get('test-rundown_1')).toEqual({
			movedSegments: [],
			notMovedSegments: ['segment-01', 'segment-03'],
			insertedSegments: [],
			deletedSegments: ['segment-02'],
		})
		expect(result.segmentChanges.get('test-rundown_2')).toEqual({
			movedSegments: [],
			notMovedSegments: ['segment-05', 'segment-06'],
			insertedSegments: [],
			deletedSegments: ['segment-04'],
		})
	})

	it('Emits rundown create over segment create', () => {
		let prevPlaylist: ResolvedPlaylist = [
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_2',
				segments: ['segment-04', 'segment-05', 'segment-06'],
			}),
		]

		let newPlaylist: ResolvedPlaylist = [
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_1',
				segments: ['segment-01', 'segment-02', 'segment-03'],
			}),
			literal<ResolvedPlaylistRundown>({
				rundownId: 'test-rundown_2',
				segments: ['segment-04', 'segment-05', 'segment-06'],
			}),
		]

		let result = DiffPlaylist(newPlaylist, prevPlaylist)

		expect(result.changes).toEqual([
			literal<PlaylistChangeRundownCreated>({
				type: PlaylistChangeType.PlaylistChangeRundownCreated,
				rundownExternalId: 'test-rundown_1',
			}),
		])
		expect(result.segmentChanges.get('test-rundown_1')).toEqual({
			movedSegments: [],
			notMovedSegments: [],
			insertedSegments: ['segment-01', 'segment-02', 'segment-03'],
			deletedSegments: [],
		})
		expect(result.segmentChanges.get('test-rundown_2')).toEqual({
			movedSegments: [],
			notMovedSegments: ['segment-04', 'segment-05', 'segment-06'],
			insertedSegments: [],
			deletedSegments: [],
		})
	})
})
