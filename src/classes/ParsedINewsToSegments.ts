import _ = require('underscore')
import { literal } from '../helpers'
import { ReducedSegment, RundownChange, RundownChangeSegmentCreate, RundownChangeType } from './RundownWatcher'

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

	static getUpdatesAndRanks (rundownId: string, inewsRaw: ReducedSegment[], previousRankings: SegmentRankings): { segments: ReducedSegment[], changes: RundownChange[] } {
		const removedSegments: string[] = []
		const segments: ReducedSegment[] = []
		const changes: RundownChange[] = []

		const rundownPreviousRanks = previousRankings.get(rundownId)

		// Initial startup of gateway
		if (
			!rundownPreviousRanks ||
			rundownPreviousRanks.size === 0
		) {
			inewsRaw.forEach((rawSegment, position) => {
				segments.push(
					literal<ReducedSegment>({
						externalId: rawSegment.externalId,
						name: rawSegment.name,
						modified: rawSegment.modified,
						rank: BASE_RANK + PAD_RANK * position
					})
				)
				changes.push(
					literal<RundownChangeSegmentCreate>({
						type: RundownChangeType.SEGMENT_CREATE,
						rundownExternalId: rundownId,
						segmentExternalId: rawSegment.externalId
					})
				)
			})
			return { segments, changes }
		}

		const newOrderSegmentIds = inewsRaw.map(raw => raw.externalId)
		const previousOrderSegmentIds = Array.from(rundownPreviousRanks.keys())
		const { movedSegments, notMovedSegments } = this.getMovedSegments(previousOrderSegmentIds, newOrderSegmentIds)
		const insertedSegments = this.getInsertedSegments(previousOrderSegmentIds, newOrderSegmentIds) // TODO: this can be returned by getMovedSegments
		const deletedSegments = this.getDeletedSegments(previousOrderSegmentIds, newOrderSegmentIds) // TODO: this can be returned by getMovedSegments
		if (removedSegments) {
			removedSegments.push(...deletedSegments)
		}

		const movedSegmentsSet = new Set(movedSegments)
		const notMovedSegmentsSet = new Set(notMovedSegments)

		let lastStayed: string = ''
		const assignedRanks: number[] = []
		inewsRaw.forEach((rawSegment) => {
			// Previously existed and is in the same place
			const previousRank = rundownPreviousRanks.get(rawSegment.externalId)?.rank
			const nextAvaliableRank = this.getNextAvailableRank(
				rundownPreviousRanks,
				assignedRanks,
				notMovedSegments[notMovedSegments.indexOf(lastStayed) + 1]
			)
			if (notMovedSegmentsSet.has(rawSegment.externalId)) {
				const newRank = previousRank ?? nextAvaliableRank
				segments.push(
					literal<ReducedSegment>({
						externalId: rawSegment.externalId,
						name: rawSegment.name,
						modified: rawSegment.modified,
						rank: newRank
					})
				)
				assignedRanks.push(newRank)
				lastStayed = rawSegment.externalId
			} else if (insertedSegments.includes(rawSegment.externalId) || movedSegmentsSet.has(rawSegment.externalId)) {
				const newRank = nextAvaliableRank
				segments.push(
					literal<ReducedSegment>({
						externalId: rawSegment.externalId,
						name: rawSegment.name,
						modified: rawSegment.modified,
						rank: newRank
					})
				)
				assignedRanks.push(newRank)
			}
		})

		return { segments: segments.sort((a, b) => a.rank < b.rank ? -1 : 1), changes: [] }
	}

	/*static parse (rundownId: string, inewsRaw: INewsStoryGW[], previousRankings: SegmentRankings, _logger?: winston.LoggerInstance, removedSegments?: string[]): RundownSegment[] {
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
						ParseDateFromInews(rawSegment.fields.modifyDate),
						`${rawSegment.identifier}`,
						BASE_RANK + PAD_RANK * position, // Offset from 0 to allow for stories arriving out of order
						rawSegment.fields.title || ''
					)
				)
			})
			return segments
		}

		const newOrderSegmentIds = inewsRaw.map(raw => raw.identifier)
		const previousOrderSegmentIds = Array.from(rundownPreviousRanks.keys())
		const { movedSegments, notMovedSegments } = this.getMovedSegments(previousOrderSegmentIds, newOrderSegmentIds)
		const insertedSegments = this.getInsertedSegments(previousOrderSegmentIds, newOrderSegmentIds) // TODO: this can be returned by getMovedSegments
		const deletedSegments = this.getDeletedSegments(previousOrderSegmentIds, newOrderSegmentIds) // TODO: this can be returned by getMovedSegments
		if (removedSegments) {
			removedSegments.push(...deletedSegments)
		}

		const movedSegmentsSet = new Set(movedSegments)
		const notMovedSegmentsSet = new Set(notMovedSegments)

		let lastStayed: string = ''
		const assignedRanks: number[] = []
		inewsRaw.forEach((rawSegment) => {
			// Previously existed and is in the same place
			const previousRank = rundownPreviousRanks.get(rawSegment.identifier)?.rank
			const nextAvaliableRank = this.getNextAvailableRank(
				rundownPreviousRanks,
				assignedRanks,
				notMovedSegments[notMovedSegments.indexOf(lastStayed) + 1]
			)
			if (notMovedSegmentsSet.has(rawSegment.identifier)) {
				const newRank = previousRank ?? nextAvaliableRank
				segments.push(
					new RundownSegment(
						rundownId,
						rawSegment,
						ParseDateFromInews(rawSegment.fields.modifyDate),
						`${rawSegment.identifier}`,
						newRank,
						rawSegment.fields.title || ''
					)
				)
				assignedRanks.push(newRank)
				lastStayed = rawSegment.identifier
			} else if (insertedSegments.includes(rawSegment.identifier) || movedSegmentsSet.has(rawSegment.identifier)) {
				const newRank = nextAvaliableRank
				segments.push(
					new RundownSegment(
						rundownId,
						rawSegment,
						ParseDateFromInews(rawSegment.fields.modifyDate),
						`${rawSegment.identifier}`,
						newRank,
						rawSegment.fields.title || ''
					)
				)
				assignedRanks.push(newRank)
			}
		})

		return segments.sort((a, b) => a.rank < b.rank ? -1 : 1)
	}*/

	static getNextAvailableRank (
		previousRanks: Map<string, SegmentRankingsInner>,
		assignedRanks: number[],
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

	static getMovedSegments (oldOrder: string[], newOrder: string[]): { movedSegments: string[]; notMovedSegments: string[] } {
		const insertedSegments = new Set(this.getInsertedSegments(oldOrder, newOrder))
		const deletedSegments = new Set(this.getDeletedSegments(oldOrder, newOrder))
		const reducedOldOrder = oldOrder.filter(segment => !deletedSegments.has(segment))
		const reducedNewOrder = newOrder.filter(segment => !insertedSegments.has(segment))

		const oldOrderInd: { [key: string]: number } = _.object(_.map(reducedOldOrder, (x,k) => [x, k]))
		const newOrderInd: number[] = _.map(reducedNewOrder, (x) => oldOrderInd[x])

		const notMovedIds = this.findLIS(newOrderInd)
		const notMovedSet = new Set(notMovedIds)

		const movedSegments = reducedOldOrder.filter((_segment, index) => !notMovedSet.has(index))
		const notMovedSegments = reducedOldOrder.filter((_segment, index) => notMovedSet.has(index))

		return { movedSegments, notMovedSegments }
	}

	// Method for finding the Longest Increasing Subsequence
	// Complexity: O(nlogn)
	static findLIS (v: number[]) {
		const P = new Array(v.length + 1).fill(Infinity)
		const Q = new Array(v.length).fill(0)
		P[0] = -Infinity
		let length = 0
		for (let i = 0; i < v.length; i++) {
			let low = 0
			let high = length
			while (low <= high) {
				const mid = Math.floor((low + high) / 2)
				if (P[mid] < v[i]) {
					low = mid + 1
				} else {
					high = mid - 1
				}
			}
			P[low] = v[i]
			Q[i] = low
			if (length < low) {
				length = low
			}
		}

		const res: number[] = new Array(length)
		let i = 0
		for (let j = 1; j < v.length; j++) {
			if (Q[j] > Q[i]) {
				i = j
			}
		}
		let tail = Q[i] - 1
		res[tail] = v[i]
		--tail
		for (let j = i - 1; j >= 0; j--) {
			if (v[j] < v[i] && Q[j] === Q[i] - 1) {
				i = j
				res[tail] = v[i]
				tail--
			}
		}

		return res
	}

}
