import { UnrankedSegment } from '../classes/RundownWatcher'
import { SegmentId } from './id'

export type ResolvedPlaylist = Array<ResolvedPlaylistRundown>
export type ResolvedPlaylistRundown = {
	rundownId: string
	segments: string[]
	backTime?: string
}

export function ResolveRundownIntoPlaylist(
	playlistExternalId: string,
	segments: Array<UnrankedSegment>
): { resolvedPlaylist: ResolvedPlaylist; untimedSegments: Set<SegmentId> } {
	const resolvedPlaylist: ResolvedPlaylist = []
	const untimedSegments: Set<SegmentId> = new Set()

	let rundownIndex = 0
	let currentRundown: ResolvedPlaylistRundown = {
		rundownId: `${playlistExternalId}_${rundownIndex + 1}`, // 1-index for users
		segments: [],
	}

	let continuityStoryFound = false
	let klarOnAirStoryFound = false

	for (const segment of segments) {
		currentRundown.segments.push(segment.externalId)
		if (!klarOnAirStoryFound && segment.name.match(/klar[\s-]*on[\s-]*air/im)) {
			klarOnAirStoryFound = true
			untimedSegments.add(segment.externalId)
		}
		// TODO: Not relevant for breaks
		if (!continuityStoryFound && segment.name.match(/^\s*continuity\s*$/i)) {
			continuityStoryFound = true
			if (segment.iNewsStory.fields.backTime?.match(/^@\d+$/)) {
				currentRundown.backTime = segment.iNewsStory.fields.backTime
			}
		}
		if (continuityStoryFound) {
			untimedSegments.add(segment.externalId)
		}

		// TODO: Breaks, future work
		/*if (segment.iNewsStory.fields.backTime?.match(/^@\d+$/)) {
			currentRundown.break = segment.iNewsStory.fields.backTime
			result.push(currentRundown)
			rundownIndex++
			currentRundown = {
				rundownId: `${playlistExternalId}_${rundownIndex + 1}`,
				segments: [],
			}
		}*/
	}

	if (currentRundown.segments.length) {
		resolvedPlaylist.push(currentRundown)
	}

	return { resolvedPlaylist, untimedSegments }
}
