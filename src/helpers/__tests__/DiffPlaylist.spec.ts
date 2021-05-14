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

		expect(result).toEqual([])
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

		expect(result).toEqual([
			literal<PlaylistChangeSegmentMoved>({
				type: PlaylistChangeType.PlaylistChangeSegmentMoved,
				segmentExternalId: 'segment-01',
			}),
			literal<PlaylistChangeSegmentMoved>({
				type: PlaylistChangeType.PlaylistChangeSegmentMoved,
				segmentExternalId: 'segment-06',
			}),
		])
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

		expect(result).toEqual([
			literal<PlaylistChangeRundownDeleted>({
				type: PlaylistChangeType.PlaylistChangeRundownDeleted,
				rundownExternalId: 'test-rundown_1',
			}),
		])
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

		expect(result).toEqual([
			literal<PlaylistChangeRundownCreated>({
				type: PlaylistChangeType.PlaylistChangeRundownCreated,
				rundownExternalId: 'test-rundown_1',
			}),
		])
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

		expect(result).toEqual([
			literal<PlaylistChangeSegmentCreated>({
				type: PlaylistChangeType.PlaylistChangeSegmentCreated,
				segmentExternalId: 'segment-02',
			}),
			literal<PlaylistChangeSegmentCreated>({
				type: PlaylistChangeType.PlaylistChangeSegmentCreated,
				segmentExternalId: 'segment-04',
			}),
		])
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

		expect(result).toEqual([
			literal<PlaylistChangeSegmentDeleted>({
				type: PlaylistChangeType.PlaylistChangeSegmentDeleted,
				segmentExternalId: 'segment-02',
			}),
			literal<PlaylistChangeSegmentDeleted>({
				type: PlaylistChangeType.PlaylistChangeSegmentDeleted,
				segmentExternalId: 'segment-04',
			}),
		])
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

		expect(result).toEqual([
			literal<PlaylistChangeRundownCreated>({
				type: PlaylistChangeType.PlaylistChangeRundownCreated,
				rundownExternalId: 'test-rundown_1',
			}),
		])
	})
})
