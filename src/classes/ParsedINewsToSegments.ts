import _ = require('underscore')
import { literal } from '../helpers'
import {
	ReducedSegment,
	RundownChange,
	RundownChangeSegmentCreate,
	RundownChangeType,
	RundownChangeSegmentUpdate,
	RundownChangeSegmentDelete,
	ReducedRundown,
	RundownChangeRundownCreate,
	RundownChangeRundownUpdate,
} from './RundownWatcher'
import * as Winston from 'winston'

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
	rank: number
}

const BASE_RANK = 1000
const PAD_RANK = 1000

export class ParsedINewsIntoSegments {
	static GetUpdatesAndRanks(
		rundownId: string,
		rundown: ReducedRundown,
		inewsRaw: ReducedSegment[],
		previousRankings: SegmentRankings,
		cachedRundown?: ReducedRundown,
		logger?: Winston.LoggerInstance
	): { segments: ReducedSegment[]; changes: RundownChange[] } {
		const segments: ReducedSegment[] = []
		const changes: RundownChange[] = []

		const rundownPreviousRanks = previousRankings.get(rundownId)

		if (!cachedRundown) {
			changes.push(
				literal<RundownChangeRundownCreate>({
					type: RundownChangeType.RUNDOWN_CREATE,
					rundownExternalId: rundownId,
				})
			)
		} else {
			if (!_.isEqual(_.omit(cachedRundown, 'segments'), _.omit(rundown, 'segments'))) {
				changes.push(
					literal<RundownChangeRundownUpdate>({
						type: RundownChangeType.RUNDOWN_UPDATE,
						rundownExternalId: rundownId,
					})
				)
			}
		}

		// Initial startup of gateway
		if (!rundownPreviousRanks || rundownPreviousRanks.size === 0) {
			inewsRaw.forEach((rawSegment, position) => {
				segments.push(
					literal<ReducedSegment>({
						externalId: rawSegment.externalId,
						name: rawSegment.name,
						modified: rawSegment.modified,
						rank: BASE_RANK + PAD_RANK * position,
					})
				)
				changes.push(
					literal<RundownChangeSegmentCreate>({
						type: RundownChangeType.SEGMENT_CREATE,
						rundownExternalId: rundownId,
						segmentExternalId: rawSegment.externalId,
						skipCache: true,
					})
				)
			})
			return { segments, changes }
		}

		const newOrderSegmentIds = inewsRaw.map((raw) => raw.externalId)
		const previousOrderSegmentIds = Array.from(rundownPreviousRanks.keys())

		const { movedSegments, notMovedSegments, insertedSegments, deletedSegments } = this.getMovedSegments(
			previousOrderSegmentIds,
			newOrderSegmentIds
		)

		const changedSegments = new Set<string>()

		deletedSegments.forEach((segmentId) => {
			if (!changedSegments.has(segmentId)) {
				changes.push(
					literal<RundownChangeSegmentDelete>({
						type: RundownChangeType.SEGMENT_DELETE,
						rundownExternalId: rundownId,
						segmentExternalId: segmentId,
					})
				)
				changedSegments.add(segmentId)
			}
		})

		movedSegments.forEach((segmentId) => {
			if (!changedSegments.has(segmentId)) {
				changes.push(
					literal<RundownChangeSegmentUpdate>({
						type: RundownChangeType.SEGMENT_UPDATE,
						rundownExternalId: rundownId,
						segmentExternalId: segmentId,
					})
				)
				changedSegments.add(segmentId)
			}
		})

		insertedSegments.forEach((segmentId) => {
			if (!changedSegments.has(segmentId)) {
				changes.push(
					literal<RundownChangeSegmentCreate>({
						type: RundownChangeType.SEGMENT_CREATE,
						rundownExternalId: rundownId,
						segmentExternalId: segmentId,
					})
				)
				changedSegments.add(segmentId)
			}
		})

		notMovedSegments.forEach((segmentId) => {
			const cachedSegment = cachedRundown?.segments.find((s) => s.externalId === segmentId)
			const newSegment = inewsRaw.find((s) => s.externalId === segmentId)

			if (cachedSegment && newSegment) {
				if (cachedSegment.modified !== newSegment.modified) {
					logger?.info(`MODIFIED DIFF: CACHED: ${cachedSegment.modified}, NEW: ${newSegment.modified}`)
					changes.push(
						literal<RundownChangeSegmentUpdate>({
							type: RundownChangeType.SEGMENT_UPDATE,
							rundownExternalId: rundownId,
							segmentExternalId: newSegment.externalId,
						})
					)
				}
			}
		})

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
						rank: newRank,
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
						rank: newRank,
					})
				)
				assignedRanks.push(newRank)
			}
		})

		return { segments: segments.sort((a, b) => (a.rank < b.rank ? -1 : 1)), changes }
	}

	static getNextAvailableRank(
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

	static getDeletedSegments(oldOrder: string[], newOrder: string[]): string[] {
		return oldOrder.filter((segment) => !newOrder.includes(segment))
	}

	static getInsertedSegments(oldOrder: string[], newOrder: string[]): string[] {
		return newOrder.filter((segment) => !oldOrder.includes(segment))
	}

	static getMovedSegments(
		oldOrder: string[],
		newOrder: string[]
	): { movedSegments: string[]; notMovedSegments: string[]; insertedSegments: string[]; deletedSegments: string[] } {
		const insertedSegments = this.getInsertedSegments(oldOrder, newOrder)
		const insertedSegmentsSet = new Set(insertedSegments)
		const deletedSegments = this.getDeletedSegments(oldOrder, newOrder)
		const deletedSegmentsSet = new Set(deletedSegments)
		const reducedOldOrder = oldOrder.filter((segment) => !deletedSegmentsSet.has(segment))
		const reducedNewOrder = newOrder.filter((segment) => !insertedSegmentsSet.has(segment))

		const oldOrderInd: Map<string, number> = new Map()
		reducedOldOrder.forEach((ord, pos) => oldOrderInd.set(ord, pos))
		const newOrderInd: number[] = []
		reducedNewOrder.forEach((x) => {
			const old = oldOrderInd.get(x)
			if (old !== undefined) {
				newOrderInd.push(old)
			}
		})

		const notMovedIds = this.findLIS(newOrderInd)
		const notMovedSet = new Set(notMovedIds)

		const movedSegments = reducedOldOrder.filter((_segment, index) => !notMovedSet.has(index))
		const notMovedSegments = reducedOldOrder.filter((_segment, index) => notMovedSet.has(index))

		return { movedSegments, notMovedSegments, insertedSegments, deletedSegments }
	}

	// Method for finding the Longest Increasing Subsequence
	// Complexity: O(nlogn)
	static findLIS(v: number[]) {
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
