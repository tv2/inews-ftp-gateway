import { RundownSegment, INewsStoryGW } from './datastructures/Segment'
import winston = require('winston')
import _ = require('underscore')

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

export type SegmentRankings = Map<string, Map<string, SegmentRankingsInner>>
export interface SegmentRankingsInner {
	/** Assigned rank */
	rank: number,
	/** Position in array */
	position: number
}

const BASE_RANK = 1000
const PAD_RANK = 1000

export class ParsedINewsIntoSegments {

	static parse (rundownId: string, inewsRaw: INewsStoryGW[], previousRankings: SegmentRankings, _logger?: winston.LoggerInstance): RundownSegment[] {
		let segments: RundownSegment[] = []

		if (inewsRaw.some(rawSegment => !rawSegment.identifier)) {
			return segments
		}

		const rundownPreviousRanks = previousRankings.get(rundownId)

		// Initial startup of gateway
		if (
			!rundownPreviousRanks ||
			rundownPreviousRanks.size === 0
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
		const previousOrderSegmentIds = Array.from(rundownPreviousRanks.keys())
		const movedSegments = this.getMovedSegments(previousOrderSegmentIds, newOrderSegmentIds)
		const insertedSegments = this.getInsertedSegments(previousOrderSegmentIds, newOrderSegmentIds)
		const stayedSegments = newOrderSegmentIds.filter(segment => !movedSegments.includes(segment) && !insertedSegments.includes(segment)) // unmoved and still exist

		let lastStayed: string = ''
		const assignedRanks: number[] = []
		inewsRaw.forEach((rawSegment) => {
			// Previously existed and is in the same place
			const previousRank = rundownPreviousRanks.get(rawSegment.identifier)?.rank
			const newRank = previousRank ?? this.getNextAvailableRank(
				rundownPreviousRanks,
				assignedRanks,
				// lastStayed,
				stayedSegments[stayedSegments.indexOf(lastStayed) + 1]
			)
			if (stayedSegments.includes(rawSegment.identifier)) {
				segments.push(
					new RundownSegment(
						rundownId,
						rawSegment,
						rawSegment.fields.modifyDate,
						`${rawSegment.identifier}`,
						newRank,
						rawSegment.fields.title || '',
						false
					)
				)
				assignedRanks.push(newRank)
				lastStayed = rawSegment.identifier
			} else if (insertedSegments.includes(rawSegment.identifier) || movedSegments.includes(rawSegment.identifier)) {
				segments.push(
					new RundownSegment(
						rundownId,
						rawSegment,
						rawSegment.fields.modifyDate,
						`${rawSegment.identifier}`,
						newRank,
						rawSegment.fields.title || '',
						false
					)
				)
				assignedRanks.push(newRank)
			}
		})

		return segments.sort((a, b) => a.rank < b.rank ? -1 : 1)
	}

	static getNextAvailableRank (
		previousRanks: Map<string, SegmentRankingsInner>,
		assignedRanks: number[],
		// previousKnownSegment?: string,
		nextKnownSegment?: string
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
