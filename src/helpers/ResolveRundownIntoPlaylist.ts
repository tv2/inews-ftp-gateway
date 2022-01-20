import { UnparsedCue } from 'inews'
import { UnrankedSegment } from '../classes/RundownWatcher'
import { SegmentId } from './id'

export type ResolvedPlaylist = Array<ResolvedPlaylistRundown>
export type ResolvedPlaylistRundown = {
	rundownId: string
	segments: string[]
	backTime?: string
	payload?: { [key: string]: any }
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

	// TODO: Use for creating multi-rundown playlists
	// const splitRundown = () => {
	// 	resolvedPlaylist.push(currentRundown)
	// 	rundownIndex++
	// 	currentRundown = {
	// 		rundownId: `${playlistExternalId}_${rundownIndex + 1}`,
	// 		segments: [],
	// 	}
	// }

	let continuityStoryFound = false
	let klarOnAirStoryFound = false

	for (const segment of segments) {
		// Check for graphic profile changes (KLAR ON AIR only).
		if (shouldLookForGraphicProfile(segment, currentRundown)) {
			const graphicProfiles = extractGraphicProfiles(segment)

			if (graphicProfiles.length > 0) {
				// Extract and set graphic profile for rundown
				const graphicProfile = graphicProfiles[0]
				currentRundown.payload = {
					...(currentRundown.payload ?? null),
					graphicProfile,
				}

				// Warn that multiple graphic profiles are used.
				if (graphicProfiles.length > 1) {
					console.warn(
						`Segment "${segment.name}" has multiple cues setting the graphic profile. Using the first profile "${graphicProfile}".`
					)
				}
			}
		}

		currentRundown.segments.push(segment.externalId)

		if (!klarOnAirStoryFound && segment.name?.match(/klar[\s-]*on[\s-]*air/im)) {
			klarOnAirStoryFound = true
			untimedSegments.add(segment.externalId)
		}

		// TODO: Not relevant for breaks
		if (!continuityStoryFound && segment.name?.match(/^\s*continuity\s*$/i)) {
			continuityStoryFound = true
			if (segment.iNewsStory.fields.backTime?.match(/^@\d+$/)) {
				currentRundown.backTime = segment.iNewsStory.fields.backTime
			}
		}
		if (continuityStoryFound) {
			untimedSegments.add(segment.externalId)
		}
	}

	if (currentRundown.segments.length) {
		resolvedPlaylist.push(currentRundown)
	}

	return { resolvedPlaylist, untimedSegments }
}

function shouldLookForGraphicProfile(segment: UnrankedSegment, rundown: ResolvedPlaylistRundown): boolean {
	const isKlarOnAirSegment = /^klar[\s-]*on[\s-]air/i.test(segment.name ?? '')
	const isFloated = segment.iNewsStory.meta.float ?? false
	const hasGraphicProfile = rundown?.payload?.graphicProfile !== undefined
	return !isFloated && isKlarOnAirSegment && !hasGraphicProfile
}

function extractGraphicProfiles(segment: UnrankedSegment): string[] {
	if (segment.iNewsStory.meta.float) {
		return []
	}

	const graphicProfiles = segment.iNewsStory.cues.reduce<string[]>((graphicProfiles: string[], cue: UnparsedCue) => {
		const numberOfCueLines = cue !== null ? cue.length : -1

		// Kommando cue with optional timing
		const kommandoPattern = /^\s*KOMMANDO\s*=\s*GRAPHICSPROFILE/i
		if (numberOfCueLines >= 2 && kommandoPattern.test(cue![0])) {
			const graphicProfile = cue![1].trim()
			return [...graphicProfiles, graphicProfile]
		}

		// Accessories cue with optional timing
		const accessoriesPattern = /^\s*ACCESSORIES\s*=\s*Graphics_Profile_/i
		if (numberOfCueLines >= 1 && accessoriesPattern.test(cue![0])) {
			const graphicProfile = cue![0].replace(accessoriesPattern, '').trim()
			return [...graphicProfiles, graphicProfile]
		}

		return graphicProfiles
	}, [])

	return graphicProfiles
}
