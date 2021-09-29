import { UnrankedSegment } from '../classes/RundownWatcher'

export type ResolvedPlaylist = Array<ResolvedPlaylistRundown>
export type ResolvedPlaylistRundown = { rundownId: string; segments: string[]; backTime?: string }

export function ResolveRundownIntoPlaylist(
	playlistExternalId: string,
	segments: Array<UnrankedSegment>
): ResolvedPlaylist {
	const result: ResolvedPlaylist = []

	let rundownIndex = 0
	let currentRundown: ResolvedPlaylistRundown = {
		rundownId: `${playlistExternalId}_${rundownIndex + 1}`, // 1-index for users
		segments: [],
	}

	let continuityStoryFound = false

	for (const segment of segments) {
		currentRundown.segments.push(segment.externalId)
		// TODO: Not relevant for breaks
		if (segment.name.match(/^continuity$/i) && !continuityStoryFound) {
			continuityStoryFound = true
			if (segment.iNewsStory.fields.backTime?.match(/^@\d+$/)) {
				currentRundown.backTime = segment.iNewsStory.fields.backTime
			}
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
		result.push(currentRundown)
	}

	return result
}
