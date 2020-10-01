import { RundownSegment, INewsStoryGW } from './datastructures/Segment'
import winston = require('winston')

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

export interface SegmentRankings {
	[rundownId: string]: {
		[segmentId: string]: {
			/** Assigned rank */
			rank: number,
			/** Position in arra */
			position: number
		}
	}
}

const BASE_RANK = 1000
const PAD_RANK = 1000

export class ParsedINewsIntoSegments {

	static parse (rundownId: string, inewsRaw: INewsStoryGW[], previousRankings: SegmentRankings, _logger?: winston.LoggerInstance): RundownSegment[] {
		let segments: RundownSegment[] = []

		if (inewsRaw.some(rawSegment => !rawSegment.identifier)) {
			return segments
		}

		// Initial startup of gateway
		if (
			JSON.stringify(previousRankings) === JSON.stringify({}) ||
			!previousRankings[rundownId] ||
			JSON.stringify(previousRankings[rundownId]) === JSON.stringify({})
		) {
			inewsRaw.forEach((rawSegment, position) => {
				segments.push(
					new RundownSegment(
						rundownId,
						rawSegment,
						rawSegment.fields.modifyDate,
						`${rawSegment.identifier}`,
						BASE_RANK + PAD_RANK * position + Math.random(), // Offset from 0 to allow for stories arriving out of order
						rawSegment.fields.title || '',
						false
					)
				)
			})
			return segments
		}

		const newOrderSegmentIds = inewsRaw.map(raw => raw.identifier)
		const previousOrderSegmentIds = Object.keys(previousRankings[rundownId])
		const movedSegments = this.getMovedSegments(previousOrderSegmentIds, newOrderSegmentIds)
		const insertedSegments = this.getInsertedSegments(previousOrderSegmentIds, newOrderSegmentIds)
		const stayedSegments = newOrderSegmentIds.filter(segment => !movedSegments.includes(segment) && !insertedSegments.includes(segment))

		let lastStayed: string = ''
		const assignedRanks: number[] = []
		inewsRaw.forEach((rawSegment) => {
			// Previously existed and is in the same place
			if (stayedSegments.includes(rawSegment.identifier)) {
				segments.push(
					new RundownSegment(
						rundownId,
						rawSegment,
						rawSegment.fields.modifyDate,
						`${rawSegment.identifier}`,
						previousRankings[rundownId][rawSegment.identifier].rank,
						rawSegment.fields.title || '',
						false
					)
				)
				assignedRanks.push(previousRankings[rundownId][rawSegment.identifier].rank)
				lastStayed = rawSegment.identifier
			} else if (insertedSegments.includes(rawSegment.identifier) || movedSegments.includes(rawSegment.identifier)) {
				segments.push(
					new RundownSegment(
						rundownId,
						rawSegment,
						rawSegment.fields.modifyDate,
						`${rawSegment.identifier}`,
						this.getNextAvailableRank(
							rundownId,
							previousRankings,
							assignedRanks,
							lastStayed,
							stayedSegments[stayedSegments.indexOf(lastStayed) + 1]
						),
						rawSegment.fields.title || '',
						false
					)
				)

				assignedRanks.push(
					this.getNextAvailableRank(
						rundownId,
						previousRankings,
						assignedRanks,
						lastStayed,
						stayedSegments[stayedSegments.indexOf(lastStayed) + 1]
					)
				)
			}
		})

		return segments.sort((a, b) => a.rank < b.rank ? -1 : 1)
	}

	static getNextAvailableRank (
		rundownId: string,
		previousRanks: SegmentRankings,
		assignedRanks: number[],
		previousKnownSegment?: string,
		nextKnownSegment?: string
	) {
		if (!previousRanks[rundownId]) {
			return BASE_RANK
		}

		if (!previousKnownSegment && !nextKnownSegment) {
			return BASE_RANK
		}

		const start = assignedRanks[assignedRanks.length - 1] ? assignedRanks[assignedRanks.length - 1] : 0

		if (!nextKnownSegment) {
			return Math.floor(start + PAD_RANK)
		}

		let end = previousRanks[rundownId][nextKnownSegment] ? previousRanks[rundownId][nextKnownSegment].rank : start + PAD_RANK

		let newRank = (start + end) / 2

		// Prevent infinite loop
		// This comes at the cost of there being a possibility of duplicate IDs *but* only when there are 1000s of stories in a single rundown.
		let attempts = 0
		while (assignedRanks.includes(newRank) && attempts < 100) {
			newRank = (newRank + end) / 2 + Math.random()
			attempts += 1
		}

		return newRank
	}

	static getDeletedSegments (oldOrder: string[], newOrder: string[]): string[] {
		return oldOrder.filter(segment => !newOrder.includes(segment))
	}

	static getInsertedSegments (oldOrder: string[], newOrder: string[]): string[] {
		return newOrder.filter(segment => !oldOrder.includes(segment))
	}

	static getMovedSegments (oldOrder: string[], newOrder: string[]): string[] {
		const insertedSegments = this.getInsertedSegments(oldOrder, newOrder)
		const deletedSegments = this.getDeletedSegments(oldOrder, newOrder)
		const reducedOldOrder = oldOrder.filter(segment => !deletedSegments.includes(segment))
		const reducedNewOrder = newOrder.filter(segment => !insertedSegments.includes(segment))

		const moved: string[] = []

		let newPointer = 0
		let origPointer = 0

		while (origPointer < oldOrder.length) {
			const newValue = reducedNewOrder[origPointer]
			const oldValue = reducedOldOrder[newPointer]

			if (newValue !== oldValue && !moved.includes(newValue)) {
				moved.push(oldValue)
			}

			newPointer++
			origPointer++
		}

		return moved
	}

}
