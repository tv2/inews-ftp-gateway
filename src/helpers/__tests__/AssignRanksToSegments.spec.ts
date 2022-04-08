import { makeSegmentRanks, rundownId } from '../../classes/__tests__/__mocks__/mockSegments'
import { AssignRanksToSegments } from '../AssignRanksToSegments'
import { PlaylistChange } from '../DiffPlaylist'

const segmentId0 = 'segment0'
const segmentId1 = 'segment1'
const segmentId2 = 'segment2'
function makePlaylistAssignments() {
	return [
		{
			rundownId: rundownId,
			segments: [segmentId0, segmentId1, segmentId2],
		},
	]
}

function makeSegmentChangesMap() {
	const segmentChanges = {
		movedSegments: [],
		notMovedSegments: [segmentId0, segmentId1, segmentId2],
		insertedSegments: [],
		deletedSegments: [],
		changedSegments: [],
	}
	return new Map([[rundownId, segmentChanges]])
}

describe('Assign Ranks To Segments', () => {
	it('Does not recalculate ranks unnecesarily', () => {
		const playlistChanges: PlaylistChange[] = []

		const newRanks = AssignRanksToSegments(
			makePlaylistAssignments(),
			playlistChanges,
			makeSegmentChangesMap(),
			makeSegmentRanks({
				[segmentId0]: { rank: 1000 },
				[segmentId1]: { rank: 1001.1 },
				[segmentId2]: { rank: 1002 },
			}),
			new Map([[rundownId, Date.now() - 60 * 1000]]) // 1 minute ago
		)
		expect(playlistChanges.length).toEqual(0)
		expect(newRanks[0].assignedRanks).toEqual(
			new Map([
				[segmentId0, 1000],
				[segmentId1, 1001.1],
				[segmentId2, 1002],
			])
		)
	})
	it('Recalculates ranks when more than three decimals', () => {
		const playlistChanges: PlaylistChange[] = []

		const newRanks = AssignRanksToSegments(
			makePlaylistAssignments(),
			playlistChanges,
			makeSegmentChangesMap(),
			makeSegmentRanks({
				[segmentId0]: { rank: 1000 },
				[segmentId1]: { rank: 1001.0001 },
				[segmentId2]: { rank: 1002 },
			}),
			new Map([[rundownId, Date.now() - 60 * 1000]]) // 1 minute ago
		)
		expect(playlistChanges.length).toEqual(2)
		expect(newRanks[0].assignedRanks).toEqual(
			new Map([
				[segmentId0, 1000],
				[segmentId1, 2000],
				[segmentId2, 3000],
			])
		)
	})
	it('Recalculates ranks when more than an hour passed', () => {
		const playlistChanges: PlaylistChange[] = []

		const newRanks = AssignRanksToSegments(
			makePlaylistAssignments(),
			playlistChanges,
			makeSegmentChangesMap(),
			makeSegmentRanks({
				[segmentId0]: { rank: 1000 },
				[segmentId1]: { rank: 1001.1 },
				[segmentId2]: { rank: 1002 },
			}),
			new Map([[rundownId, Date.now() - 61 * 60 * 1000]]) // 61 minutes ago
		)
		expect(playlistChanges.length).toEqual(2)
		expect(newRanks[0].assignedRanks).toEqual(
			new Map([
				[segmentId0, 1000],
				[segmentId1, 2000],
				[segmentId2, 3000],
			])
		)
	})
})
