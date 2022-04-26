import { RundownId, SegmentId } from '../helpers/id'
import _ = require('underscore')
import { Logger } from '@tv2media/logger'
import { SegmentChanges } from '../helpers/DiffPlaylist'

export interface IParsedElement {
	data: {
		id?: string
		name?: string
		type?: string
		float: string
		script?: string
		objectType?: string
		duration?: string
		clipName?: string
	}
}

export type SegmentRankings = Map<RundownId, Map<SegmentId, SegmentRankingsInner>>
export interface SegmentRankingsInner {
	/** Assigned rank */
	rank: number
}

const BASE_RANK = 1000
const PAD_RANK = 1000

type UpdatesAndRanks = { segmentRanks: Map<SegmentId, number>; recalculatedAsIntegers: boolean }

export class ParsedINewsIntoSegments {
	static GetRanks(
		rundownId: RundownId,
		segmentOrder: SegmentId[],
		previousRankings: SegmentRankings,
		{ movedSegments, notMovedSegments, insertedSegments }: SegmentChanges,
		logger?: Logger
	): UpdatesAndRanks {
		const segmentRanks: Map<SegmentId, number> = new Map()

		const rundownPreviousRanks = previousRankings.get(rundownId)

		// Initial startup of gateway
		if (!rundownPreviousRanks || rundownPreviousRanks.size === 0) {
			logger?.debug(`Recalculate ranks for ${rundownId}`)
			return ParsedINewsIntoSegments.RecalculateRanksAsIntegerValues(segmentOrder)
		}

		const movedSegmentsSet = new Set(movedSegments)
		const notMovedSegmentsSet = new Set(notMovedSegments)

		let lastStayed: string = ''
		const assignedRanks: number[] = []
		segmentOrder.forEach((segmentId) => {
			// Previously existed and is in the same place
			const previousRank = rundownPreviousRanks.get(segmentId)?.rank
			const nextAvaliableRank = this.getNextAvailableRank(
				rundownPreviousRanks,
				assignedRanks,
				notMovedSegments[notMovedSegments.indexOf(lastStayed) + 1]
			)
			if (notMovedSegmentsSet.has(segmentId)) {
				const newRank = previousRank ?? nextAvaliableRank
				segmentRanks.set(segmentId, newRank)
				assignedRanks.push(newRank)
				lastStayed = segmentId
			} else if (insertedSegments.includes(segmentId) || movedSegmentsSet.has(segmentId)) {
				const newRank = nextAvaliableRank
				segmentRanks.set(segmentId, newRank)
				assignedRanks.push(newRank)
			} else {
				logger?.data(insertedSegments.join(',')).debug(`Don't know what to do with ranks for ${segmentId}`)
			}
		})

		return { segmentRanks, recalculatedAsIntegers: false }
	}

	static RecalculateRanksAsIntegerValues(segmentOrder: SegmentId[]): UpdatesAndRanks {
		const segmentRanks: Map<SegmentId, number> = new Map()

		segmentOrder.forEach((segmentId, position) => {
			segmentRanks.set(segmentId, BASE_RANK + PAD_RANK * position)
		})
		return { segmentRanks, recalculatedAsIntegers: true }
	}

	static getNextAvailableRank(
		previousRanks: Map<SegmentId, SegmentRankingsInner>,
		assignedRanks: number[],
		nextKnownSegment?: SegmentId
	): number {
		const lastAssignedRank = _.last(assignedRanks)
		const nextKnownRank = nextKnownSegment ? previousRanks.get(nextKnownSegment) : undefined

		if (lastAssignedRank !== undefined && nextKnownRank !== undefined) {
			return (lastAssignedRank + nextKnownRank.rank) / 2
		} else if (lastAssignedRank !== undefined) {
			return lastAssignedRank + PAD_RANK
		} else if (nextKnownRank !== undefined) {
			return nextKnownRank.rank / 2
		} else {
			return BASE_RANK
		}
	}
}
