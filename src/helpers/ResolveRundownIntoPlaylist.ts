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
): { resolvedRundown: ResolvedPlaylistRundown; untimedSegments: Set<SegmentId> } {
	const untimedSegments: Set<SegmentId> = new Set()

	let rundownIndex = 0
	const resolvedRundown: ResolvedPlaylistRundown = {
		rundownId: `${playlistExternalId}_${rundownIndex + 1}`, // 1-index for users
		segments: [],
		payload: {
			rank: 0,
		},
	}

	let continuityStoryFound = false
	let klarOnAirStoryFound = false

	for (const segment of segments) {
		if (shouldLookForShowstyleVariant(segment, resolvedRundown)) {
			const showstyleVariantsForSegment = getOrderedShowstyleVariants(segment)
			if (showstyleVariantsForSegment.length > 0) {
				setShowstyleVariant(resolvedRundown, showstyleVariantsForSegment[0])
			}
		}

		resolvedRundown.segments.push(segment.externalId)

		const isFloated = segment.iNewsStory.meta.float ?? false
		if (!isFloated && !klarOnAirStoryFound && isKlarOnAir(segment)) {
			klarOnAirStoryFound = true
			untimedSegments.add(segment.externalId)
		}

		// TODO: Not relevant for breaks
		if (!continuityStoryFound && segment.name?.match(/^\s*continuity\s*$/i)) {
			continuityStoryFound = true
			if (segment.iNewsStory.fields.backTime?.match(/^@\d+$/)) {
				resolvedRundown.backTime = segment.iNewsStory.fields.backTime
			}
		}
		if (continuityStoryFound) {
			untimedSegments.add(segment.externalId)
		}
	}

	return { resolvedRundown, untimedSegments }
}

function shouldLookForShowstyleVariant(segment: UnrankedSegment, rundown: ResolvedPlaylistRundown): boolean {
	const isFloated: boolean = !!segment.iNewsStory.meta.float ?? false
	const hasShowstyleVariant: boolean = rundown.payload?.showstyleVariant !== undefined
	return !isFloated && !hasShowstyleVariant
}

function getOrderedShowstyleVariants(segment: UnrankedSegment): string[] {
	const cueOrder: number[] = getCueOrder(segment)
	const orderedShowstyleVariants: string[] = []
	cueOrder.forEach((cueIndex: number) => {
		const parsedProfile: string | null = parseShowstyleVariant(segment.iNewsStory.cues[cueIndex] ?? [])
		if (parsedProfile) {
			orderedShowstyleVariants.push(parsedProfile)
		}
	})
	return orderedShowstyleVariants
}

function parseShowstyleVariant(cue: string[]): string | null {
	const numberOfCueLines: number = cue.length

	// Kommando cue (ignoring timing)
	const showstyleVariantPattern: RegExp = /^\s*SOFIE\s*=\s*SHOWSTYLEVARIANT/i
	if (numberOfCueLines >= 2 && showstyleVariantPattern.test(cue![0])) {
		return cue![1].trim()
	}
	return null
}

/**
 *
 * @param segment The segment for which the cue order should be retrieved
 * @returns A list of indicies representing the cue order.
 */
function getCueOrder(segment: UnrankedSegment): number[] {
	const body = segment.iNewsStory.body ?? ''
	const refPattern = /<a\s+idref="(?<id>\d+)"\s*\/?>/gi
	const order: number[] = []
	let match: RegExpExecArray | null
	while ((match = refPattern.exec(body))) {
		let id = parseInt(match.groups!.id, 10)
		order.push(id)
	}
	return order
}

function setShowstyleVariant(rundown: ResolvedPlaylistRundown, showstyleVariant: string) {
	rundown.payload = {
		...(rundown.payload ?? null),
		showstyleVariant,
	}
}

function isKlarOnAir(segment: UnrankedSegment): boolean {
	const klarOnAirPattern = /klar[\s-]*on[\s-]*air/im
	return !!segment.name?.match(klarOnAirPattern)
}
