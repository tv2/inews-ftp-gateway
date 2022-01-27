import { SegmentId } from './id'

export function GetMovedSegments(
	oldOrder: SegmentId[],
	newOrder: SegmentId[]
): {
	movedSegments: SegmentId[]
	notMovedSegments: SegmentId[]
	insertedSegments: SegmentId[]
	deletedSegments: SegmentId[]
} {
	const insertedSegments = GetInsertedSegments(oldOrder, newOrder)
	const insertedSegmentsSet = new Set(insertedSegments)
	const deletedSegments = GetDeletedSegments(oldOrder, newOrder)
	const deletedSegmentsSet = new Set(deletedSegments)
	const reducedOldOrder = oldOrder.filter((segment) => !deletedSegmentsSet.has(segment))
	const reducedNewOrder = newOrder.filter((segment) => !insertedSegmentsSet.has(segment))

	const oldOrderInd: Map<SegmentId, number> = new Map()
	reducedOldOrder.forEach((ord, pos) => oldOrderInd.set(ord, pos))
	const newOrderInd: number[] = []
	reducedNewOrder.forEach((x) => {
		const old = oldOrderInd.get(x)
		if (old !== undefined) {
			newOrderInd.push(old)
		}
	})

	const notMovedIds = findLIS(newOrderInd)
	const notMovedSet = new Set(notMovedIds)

	const movedSegments = reducedOldOrder.filter((_segment, index) => !notMovedSet.has(index))
	const notMovedSegments = reducedOldOrder.filter((_segment, index) => notMovedSet.has(index))

	return { movedSegments, notMovedSegments, insertedSegments, deletedSegments }
}

export function GetDeletedSegments(oldOrder: SegmentId[], newOrder: SegmentId[]): SegmentId[] {
	return oldOrder.filter((segment) => !newOrder.includes(segment))
}

export function GetInsertedSegments(oldOrder: SegmentId[], newOrder: SegmentId[]): SegmentId[] {
	return newOrder.filter((segment) => !oldOrder.includes(segment))
}

// Method for finding the Longest Increasing Subsequence
// Complexity: O(nlogn)
function findLIS(v: number[]) {
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
