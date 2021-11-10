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
		if (!klarOnAirStoryFound && isSegmentTitleReadyOnAir(segment)) {
			klarOnAirStoryFound = true
			untimedSegments.add(segment.externalId)
		}
		// TODO: Not relevant for breaks
		if (!continuityStoryFound && isSegmentTitleContinuity(segment)) {
			continuityStoryFound = true
			if (isSegmentBackTimeCorrectFormat(segment)) {
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

function isSegmentTitleReadyOnAir(segment: UnrankedSegment): boolean {
	return /klar[\s-]*on[\s-]*air/im.test(segment.name)
}

function isSegmentTitleContinuity(segment: UnrankedSegment): boolean {
	return /^\s*continuity\s*$/i.test(segment.name)
}

function isSegmentBackTimeCorrectFormat(segment: UnrankedSegment): boolean {
	const backTime: string = segment.iNewsStory.fields.backTime ? segment.iNewsStory.fields.backTime : ''
	const atSignWithNumbers: RegExp = /^@\d+$/
	return atSignWithNumbers.test(backTime)
}
