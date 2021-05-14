import { ParsedINewsIntoSegments, SegmentRankingsInner, SegmentRankings } from '../ParsedINewsToSegments'

import {
	segmentGW01,
	segmentGW02,
	segmentGW03,
	segmentGW04,
	segmentGW08,
	segmentGW05,
	segmentGW06,
	segmentGW07,
} from './__mocks__/mockSegments'
import { ReducedSegment } from '../RundownWatcher'
import { GetDeletedSegments, GetInsertedSegments, GetMovedSegments } from '../../helpers/GetMovedSegments'
import { SegmentId } from '../../helpers/id'

const rundownId = 'test-rundown'

function makeSegmentRanks(segments: { [segmentId: string]: SegmentRankingsInner }): SegmentRankings {
	const ranks: SegmentRankings = new Map()

	ranks.set(rundownId, makeSegmentRanksInner(segments))

	return ranks
}

function makeSegmentRanksInner(segments: {
	[segmentId: string]: SegmentRankingsInner
}): Map<SegmentId, SegmentRankingsInner> {
	const segmentRanksInner: Map<SegmentId, SegmentRankingsInner> = new Map()

	for (const segmentId in segments) {
		segmentRanksInner.set(segmentId, segments[segmentId])
	}

	return segmentRanksInner
}

describe('ParsedINewsIntoSegments', () => {
	it('Finds the the next available rank', () => {
		const previousRanks = makeSegmentRanksInner({
			'segment-01': { rank: 1000 },
			'segment-02': { rank: 2000 },
			'segment-03': { rank: 5000 },
		})

		let result = ParsedINewsIntoSegments.getNextAvailableRank(previousRanks, [1000, 2000, 5000])
		expect(result).toEqual(6000)

		result = ParsedINewsIntoSegments.getNextAvailableRank(previousRanks, [], 'segment-01')
		expect(result).toEqual(500)

		result = ParsedINewsIntoSegments.getNextAvailableRank(previousRanks, [1000, 2000, 5000])
		expect(result).toEqual(6000)

		result = ParsedINewsIntoSegments.getNextAvailableRank(previousRanks, [1000, 5000], undefined)
		expect(result).toEqual(6000)

		result = ParsedINewsIntoSegments.getNextAvailableRank(previousRanks, [1000], 'segment-02')
		expect(result).toEqual(1500)

		result = ParsedINewsIntoSegments.getNextAvailableRank(previousRanks, [1000, 2000, 1500], 'segment-02')
		expect(result).toEqual(1750)

		result = ParsedINewsIntoSegments.getNextAvailableRank(previousRanks, [1000, 2000], 'segment-03')
		expect(result).toEqual(3500)
	})

	it('Finds deleted segments', () => {
		const result = GetDeletedSegments(
			['segment-01', 'segment-02', 'segment-03', 'segment-04'],
			['segment-01', 'segment-04', 'segment-03']
		)
		expect(result).toEqual(['segment-02'])
	})

	it('Finds new segments', () => {
		const result = GetInsertedSegments(
			['segment-01', 'segment-02'],
			['segment-01', 'segment-03', 'segment-02', 'segment-04']
		)
		expect(result).toEqual(['segment-03', 'segment-04'])
	})

	it('Finds moved segments', () => {
		let result = GetMovedSegments(
			['segment-01', 'segment-02', 'segment-03'],
			['segment-01', 'segment-03', 'segment-02'] // LIS: 01, 03
		)
		expect(result).toEqual({
			movedSegments: ['segment-02'],
			notMovedSegments: ['segment-01', 'segment-03'],
			deletedSegments: [],
			insertedSegments: [],
		})

		result = GetMovedSegments(
			['segment-01', 'segment-02', 'segment-03'],
			['segment-01', 'segment-03', 'segment-04', 'segment-05', 'segment-02'] // LIS: 01, 03
		)
		expect(result).toEqual({
			movedSegments: ['segment-02'],
			notMovedSegments: ['segment-01', 'segment-03'],
			deletedSegments: [],
			insertedSegments: ['segment-04', 'segment-05'],
		})

		result = GetMovedSegments(
			['segment-01', 'segment-02', 'segment-03'],
			['segment-03', 'segment-01', 'segment-02', 'segment-04', 'segment-05'] // LIS: 01, 02
		)
		expect(result).toEqual({
			movedSegments: ['segment-03'],
			notMovedSegments: ['segment-01', 'segment-02'],
			deletedSegments: [],
			insertedSegments: ['segment-04', 'segment-05'],
		})

		result = GetMovedSegments(
			['segment-01', 'segment-02', 'segment-03'],
			['segment-04', 'segment-02', 'segment-03', 'segment-05', 'segment-01'] // LIS: 02, 04
		)
		expect(result).toEqual({
			movedSegments: ['segment-01'],
			notMovedSegments: ['segment-02', 'segment-03'],
			deletedSegments: [],
			insertedSegments: ['segment-04', 'segment-05'],
		})

		result = GetMovedSegments(
			['segment-01', 'segment-02', 'segment-03', 'segment-04', 'segment-05'],
			['segment-02', 'segment-03', 'segment-05', 'segment-04', 'segment-01'] // LIS: 02, 03, 05
		)
		expect(result).toEqual({
			movedSegments: ['segment-01', 'segment-04'],
			notMovedSegments: ['segment-02', 'segment-03', 'segment-05'],
			deletedSegments: [],
			insertedSegments: [],
		})

		result = GetMovedSegments(
			['segment-01', 'segment-02', 'segment-03', 'segment-04'],
			['segment-01', 'segment-03', 'segment-02', 'segment-04'] // LIS: 01, 02, 04
		)
		expect(result).toEqual({
			movedSegments: ['segment-03'],
			notMovedSegments: ['segment-01', 'segment-02', 'segment-04'],
			deletedSegments: [],
			insertedSegments: [],
		})
	})

	it('Assigns initial ranks', () => {
		const iNewsRaw: ReducedSegment[] = [segmentGW01, segmentGW02, segmentGW03]
		const rundownId = 'test-rundown'

		const { movedSegments, notMovedSegments, insertedSegments, deletedSegments } = GetMovedSegments(
			[],
			iNewsRaw.map((s) => s.externalId)
		)
		const result = ParsedINewsIntoSegments.GetRanks(
			rundownId,
			iNewsRaw.map((s) => s.externalId),
			new Map(),
			movedSegments,
			notMovedSegments,
			insertedSegments,
			deletedSegments
		)
		const segments: Array<{ rank: number; externalId: SegmentId }> = []
		for (let [segmentId, rank] of result.segmentRanks) {
			segments.push({ externalId: segmentId, rank })
		}
		expect(segments).toEqual([
			{
				rank: 1000,
				externalId: 'segment-01',
			},
			{
				rank: 2000,
				externalId: 'segment-02',
			},
			{
				rank: 3000,
				externalId: 'segment-03',
			},
		])
	})

	it('Preserves existing ranks', () => {
		const iNewsRaw: ReducedSegment[] = [segmentGW01, segmentGW02, segmentGW03]
		const rundownId = 'test-rundown'
		const previousRanks = makeSegmentRanks({
			'segment-01': { rank: 1 },
			'segment-02': { rank: 2 },
			'segment-03': { rank: 3 },
		})

		const { movedSegments, notMovedSegments, insertedSegments, deletedSegments } = GetMovedSegments(
			['segment-01', 'segment-02', 'segment-03'],
			iNewsRaw.map((s) => s.externalId)
		)
		const result = ParsedINewsIntoSegments.GetRanks(
			rundownId,
			iNewsRaw.map((s) => s.externalId),
			previousRanks,
			movedSegments,
			notMovedSegments,
			insertedSegments,
			deletedSegments
		)
		const segments: Array<{ rank: number; externalId: SegmentId }> = []
		for (let [segmentId, rank] of result.segmentRanks) {
			segments.push({ externalId: segmentId, rank })
		}
		expect(segments).toEqual([
			{
				rank: 1,
				externalId: 'segment-01',
			},
			{
				rank: 2,
				externalId: 'segment-02',
			},
			{
				rank: 3,
				externalId: 'segment-03',
			},
		])
	})

	it('Creates a new rank for a new segment', () => {
		const iNewsRaw: ReducedSegment[] = [segmentGW01, segmentGW02, segmentGW04, segmentGW03]
		const rundownId = 'test-rundown'
		const previousRanks = makeSegmentRanks({
			'segment-01': { rank: 1 },
			'segment-02': { rank: 2 },
			'segment-03': { rank: 3 },
		})

		const { movedSegments, notMovedSegments, insertedSegments, deletedSegments } = GetMovedSegments(
			['segment-01', 'segment-02', 'segment-03'],
			iNewsRaw.map((s) => s.externalId)
		)
		const result = ParsedINewsIntoSegments.GetRanks(
			rundownId,
			iNewsRaw.map((s) => s.externalId),
			previousRanks,
			movedSegments,
			notMovedSegments,
			insertedSegments,
			deletedSegments
		)
		const segments: Array<{ rank: number; externalId: SegmentId }> = []
		for (let [segmentId, rank] of result.segmentRanks) {
			segments.push({ externalId: segmentId, rank })
		}
		expect(segments).toEqual([
			{
				rank: 1,
				externalId: 'segment-01',
			},
			{
				rank: 2,
				externalId: 'segment-02',
			},
			{
				rank: 2.5,
				externalId: 'segment-04',
			},
			{
				rank: 3,
				externalId: 'segment-03',
			},
		])
	})

	it('Preserves existing ranks and creates new', () => {
		const iNewsRaw: ReducedSegment[] = [
			segmentGW08,
			segmentGW01,
			segmentGW02,
			segmentGW03,
			segmentGW04,
			segmentGW05,
			segmentGW06,
			segmentGW07,
		]
		const rundownId = 'test-rundown'
		const previousRanks = makeSegmentRanks({
			'segment-01': { rank: 1000 },
			'segment-02': { rank: 2000 },
			'segment-03': { rank: 3000 },
		})

		const { movedSegments, notMovedSegments, insertedSegments, deletedSegments } = GetMovedSegments(
			['segment-01', 'segment-02', 'segment-03'],
			iNewsRaw.map((s) => s.externalId)
		)
		const result = ParsedINewsIntoSegments.GetRanks(
			rundownId,
			iNewsRaw.map((s) => s.externalId),
			previousRanks,
			movedSegments,
			notMovedSegments,
			insertedSegments,
			deletedSegments
		)
		const segments: Array<{ rank: number; externalId: SegmentId }> = []
		for (let [segmentId, rank] of result.segmentRanks) {
			segments.push({ externalId: segmentId, rank })
		}
		expect(segments).toEqual([
			{
				rank: 500,
				externalId: 'segment-08',
			},
			{
				rank: 1000,
				externalId: 'segment-01',
			},
			{
				rank: 2000,
				externalId: 'segment-02',
			},
			{
				rank: 3000,
				externalId: 'segment-03',
			},
			{
				rank: 4000,
				externalId: 'segment-04',
			},
			{
				rank: 5000,
				externalId: 'segment-05',
			},
			{
				rank: 6000,
				externalId: 'segment-06',
			},
			{
				rank: 7000,
				externalId: 'segment-07',
			},
		])
	})

	it('Creates a new rank for a moved segment', () => {
		const iNewsRaw: ReducedSegment[] = [
			segmentGW01,
			segmentGW03,
			segmentGW02, // LIS: 01, 03
		]
		const rundownId = 'test-rundown'
		const previousRanks = makeSegmentRanks({
			'segment-01': { rank: 1000 },
			'segment-02': { rank: 2000 },
			'segment-03': { rank: 3000 },
		})

		const { movedSegments, notMovedSegments, insertedSegments, deletedSegments } = GetMovedSegments(
			['segment-01', 'segment-02', 'segment-03'],
			iNewsRaw.map((s) => s.externalId)
		)
		const result = ParsedINewsIntoSegments.GetRanks(
			rundownId,
			iNewsRaw.map((s) => s.externalId),
			previousRanks,
			movedSegments,
			notMovedSegments,
			insertedSegments,
			deletedSegments
		)
		const segments: Array<{ rank: number; externalId: SegmentId }> = []
		for (let [segmentId, rank] of result.segmentRanks) {
			segments.push({ externalId: segmentId, rank })
		}
		expect(segments).toEqual([
			{
				rank: 1000,
				externalId: 'segment-01',
			},
			{
				rank: 3000,
				externalId: 'segment-03',
			},
			{
				rank: 4000,
				externalId: 'segment-02',
			},
		])
	})

	it('Handles more than one segment changing rank', () => {
		const iNewsRaw: ReducedSegment[] = [
			segmentGW02,
			segmentGW01,
			segmentGW04,
			segmentGW03, // LIS: 01, 04
		]
		const rundownId = 'test-rundown'
		const previousRanks = makeSegmentRanks({
			'segment-01': { rank: 1000 },
			'segment-02': { rank: 1500 },
			'segment-03': { rank: 2000 },
			'segment-04': { rank: 3000 },
		})

		const { movedSegments, notMovedSegments, insertedSegments, deletedSegments } = GetMovedSegments(
			['segment-01', 'segment-02', 'segment-03', 'segment-04'],
			iNewsRaw.map((s) => s.externalId)
		)
		const result = ParsedINewsIntoSegments.GetRanks(
			rundownId,
			iNewsRaw.map((s) => s.externalId),
			previousRanks,
			movedSegments,
			notMovedSegments,
			insertedSegments,
			deletedSegments
		)
		const segments: Array<{ rank: number; externalId: SegmentId }> = []
		for (let [segmentId, rank] of result.segmentRanks) {
			segments.push({ externalId: segmentId, rank })
		}
		expect(segments).toEqual([
			{
				rank: 500,
				externalId: 'segment-02',
			},
			{
				rank: 1000,
				externalId: 'segment-01',
			},
			{
				rank: 3000,
				externalId: 'segment-04',
			},
			{
				rank: 4000,
				externalId: 'segment-03',
			},
		])
	})

	it('Handles more than one segment changing rank (with unaffected segments surrounding)', () => {
		const iNewsRaw: ReducedSegment[] = [
			segmentGW05,
			segmentGW02,
			segmentGW01,
			segmentGW04,
			segmentGW03,
			segmentGW06, // LIS: 05, 01, 03, 06
		]
		const rundownId = 'test-rundown'
		const previousRanks = makeSegmentRanks({
			'segment-05': { rank: 1000 },
			'segment-01': { rank: 2000 },
			'segment-02': { rank: 2500 },
			'segment-03': { rank: 3000 },
			'segment-04': { rank: 4000 },
			'segment-06': { rank: 5000 },
		})

		const { movedSegments, notMovedSegments, insertedSegments, deletedSegments } = GetMovedSegments(
			['segment-05', 'segment-01', 'segment-02', 'segment-03', 'segment-04', 'segment-06'],
			iNewsRaw.map((s) => s.externalId)
		)
		const result = ParsedINewsIntoSegments.GetRanks(
			rundownId,
			iNewsRaw.map((s) => s.externalId),
			previousRanks,
			movedSegments,
			notMovedSegments,
			insertedSegments,
			deletedSegments
		)
		const segments: Array<{ rank: number; externalId: SegmentId }> = []
		for (let [segmentId, rank] of result.segmentRanks) {
			segments.push({ externalId: segmentId, rank })
		}
		expect(result).toEqual([
			{
				rank: 1000,
				externalId: 'segment-05',
			},
			{
				rank: 1500,
				externalId: 'segment-02',
			},
			{
				rank: 2000,
				externalId: 'segment-01',
			},
			{
				rank: 2500,
				externalId: 'segment-04',
			},
			{
				rank: 3000,
				externalId: 'segment-03',
			},
			{
				rank: 5000,
				externalId: 'segment-06',
			},
		])
	})

	it('Handles more than one segment changing rank (with segments inserted)', () => {
		const iNewsRaw: ReducedSegment[] = [
			segmentGW05,
			segmentGW02,
			segmentGW01,
			segmentGW04,
			segmentGW03,
			segmentGW07,
			segmentGW08,
			segmentGW06, // LIS: 05, 01, 03, 06
		]
		const rundownId = 'test-rundown'
		const previousRanks = makeSegmentRanks({
			'segment-05': { rank: 1000 }, // Stay
			'segment-01': { rank: 2000 }, // Stay
			'segment-02': { rank: 2500 },
			'segment-03': { rank: 3000 }, // Stay
			'segment-04': { rank: 4000 },
			'segment-06': { rank: 5000 }, // Stay
		})

		const { movedSegments, notMovedSegments, insertedSegments, deletedSegments } = GetMovedSegments(
			['segment-05', 'segment-01', 'segment-02', 'segment-03', 'segment-04', 'segment-06'],
			iNewsRaw.map((s) => s.externalId)
		)
		const result = ParsedINewsIntoSegments.GetRanks(
			rundownId,
			iNewsRaw.map((s) => s.externalId),
			previousRanks,
			movedSegments,
			notMovedSegments,
			insertedSegments,
			deletedSegments
		)
		const segments: Array<{ rank: number; externalId: SegmentId }> = []
		for (let [segmentId, rank] of result.segmentRanks) {
			segments.push({ externalId: segmentId, rank })
		}
		expect(result).toEqual([
			{
				rank: 1000,
				externalId: 'segment-05',
			},
			{
				rank: 1500,
				externalId: 'segment-02',
			},
			{
				rank: 2000,
				externalId: 'segment-01',
			},
			{
				rank: 2500,
				externalId: 'segment-04',
			},
			{
				rank: 3000,
				externalId: 'segment-03',
			},
			{
				rank: 4000,
				externalId: 'segment-07',
			},
			{
				rank: 4500,
				externalId: 'segment-08',
			},
			{
				rank: 5000,
				externalId: 'segment-06',
			},
		])
	})

	it('Preserves fractional previous ranks', () => {
		const iNewsRaw: ReducedSegment[] = [
			segmentGW05,
			segmentGW02,
			segmentGW01,
			segmentGW04,
			segmentGW03,
			segmentGW07,
			segmentGW08,
			segmentGW06,
		]
		const rundownId = 'test-rundown'
		const previousRanks = makeSegmentRanks({
			'segment-05': { rank: 1000 },
			'segment-02': { rank: 1500 },
			'segment-01': { rank: 2000 },
			'segment-04': { rank: 4000 },
			'segment-03': { rank: 4125 },
			'segment-07': { rank: 4250 },
			'segment-08': { rank: 4500 },
			'segment-06': { rank: 5000 },
		})

		const { movedSegments, notMovedSegments, insertedSegments, deletedSegments } = GetMovedSegments(
			['segment-05', 'segment-02', 'segment-01', 'segment-04', 'segment-03', 'segment-07', 'segment-08', 'segment-06'],
			iNewsRaw.map((s) => s.externalId)
		)
		const result = ParsedINewsIntoSegments.GetRanks(
			rundownId,
			iNewsRaw.map((s) => s.externalId),
			previousRanks,
			movedSegments,
			notMovedSegments,
			insertedSegments,
			deletedSegments
		)
		const segments: Array<{ rank: number; externalId: SegmentId }> = []
		for (let [segmentId, rank] of result.segmentRanks) {
			segments.push({ externalId: segmentId, rank })
		}
		expect(result).toEqual([
			{
				rank: 1000,
				externalId: 'segment-05',
			},
			{
				rank: 1500,
				externalId: 'segment-02',
			},
			{
				rank: 2000,
				externalId: 'segment-01',
			},
			{
				rank: 4000,
				externalId: 'segment-04',
			},
			{
				rank: 4125,
				externalId: 'segment-03',
			},
			{
				rank: 4250,
				externalId: 'segment-07',
			},
			{
				rank: 4500,
				externalId: 'segment-08',
			},
			{
				rank: 5000,
				externalId: 'segment-06',
			},
		])
	})

	it('Handles multiple reorderings', () => {
		let iNewsRaw: ReducedSegment[] = [
			segmentGW05,
			segmentGW02,
			segmentGW01,
			segmentGW04,
			segmentGW03,
			segmentGW07,
			segmentGW08,
			segmentGW06,
		]
		const rundownId = 'test-rundown'
		let previousRanks = makeSegmentRanks({
			'segment-05': { rank: 1000 },
			'segment-02': { rank: 1500 },
			'segment-01': { rank: 2000 },
			'segment-04': { rank: 4000 },
			'segment-03': { rank: 4125 },
			'segment-07': { rank: 4250 },
			'segment-08': { rank: 4500 },
			'segment-06': { rank: 5000 },
		})

		let { movedSegments, notMovedSegments, insertedSegments, deletedSegments } = GetMovedSegments(
			['segment-05', 'segment-02', 'segment-01', 'segment-04', 'segment-03', 'segment-07', 'segment-08', 'segment-06'],
			iNewsRaw.map((s) => s.externalId)
		)
		let result = ParsedINewsIntoSegments.GetRanks(
			rundownId,
			iNewsRaw.map((s) => s.externalId),
			previousRanks,
			movedSegments,
			notMovedSegments,
			insertedSegments,
			deletedSegments
		)
		let segments: Array<{ rank: number; externalId: SegmentId }> = []
		for (let [segmentId, rank] of result.segmentRanks) {
			segments.push({ externalId: segmentId, rank })
		}
		expect(result).toEqual([
			{
				rank: 1000,
				externalId: 'segment-05',
			},
			{
				rank: 1500,
				externalId: 'segment-02',
			},
			{
				rank: 2000,
				externalId: 'segment-01',
			},
			{
				rank: 4000,
				externalId: 'segment-04',
			},
			{
				rank: 4125,
				externalId: 'segment-03',
			},
			{
				rank: 4250,
				externalId: 'segment-07',
			},
			{
				rank: 4500,
				externalId: 'segment-08',
			},
			{
				rank: 5000,
				externalId: 'segment-06',
			},
		])

		iNewsRaw = [
			segmentGW05,
			segmentGW01,
			segmentGW02,
			segmentGW04,
			segmentGW03,
			segmentGW07,
			segmentGW08,
			segmentGW06, // LIS: 05, 02, 04, 03, 07, 08, 09
		]

		previousRanks = makeSegmentRanks({
			'segment-05': { rank: 1000 },
			'segment-02': { rank: 1500 },
			'segment-01': { rank: 2000 },
			'segment-04': { rank: 4000 },
			'segment-03': { rank: 4125 },
			'segment-07': { rank: 4250 },
			'segment-08': { rank: 4500 },
			'segment-06': { rank: 5000 },
		})

		let {
			movedSegments: movedSegments2,
			notMovedSegments: notMovedSegments2,
			insertedSegments: insertedSegments2,
			deletedSegments: deletedSegments2,
		} = GetMovedSegments(
			['segment-05', 'segment-02', 'segment-01', 'segment-04', 'segment-03', 'segment-07', 'segment-08', 'segment-06'],
			iNewsRaw.map((s) => s.externalId)
		)
		result = ParsedINewsIntoSegments.GetRanks(
			rundownId,
			iNewsRaw.map((s) => s.externalId),
			previousRanks,
			movedSegments2,
			notMovedSegments2,
			insertedSegments2,
			deletedSegments2
		)
		segments = []
		for (let [segmentId, rank] of result.segmentRanks) {
			segments.push({ externalId: segmentId, rank })
		}
		expect(result).toEqual([
			{
				rank: 1000,
				externalId: 'segment-05',
			},
			{
				rank: 1250,
				externalId: 'segment-01',
			},
			{
				rank: 1500,
				externalId: 'segment-02',
			},
			{
				rank: 4000,
				externalId: 'segment-04',
			},
			{
				rank: 4125,
				externalId: 'segment-03',
			},
			{
				rank: 4250,
				externalId: 'segment-07',
			},
			{
				rank: 4500,
				externalId: 'segment-08',
			},
			{
				rank: 5000,
				externalId: 'segment-06',
			},
		])

		iNewsRaw = [segmentGW05, segmentGW01, segmentGW04, segmentGW02, segmentGW03, segmentGW08, segmentGW06, segmentGW07]

		previousRanks = makeSegmentRanks({
			'segment-05': { rank: 1000 },
			'segment-01': { rank: 2000 },
			'segment-02': { rank: 3000 },
			'segment-04': { rank: 4000 },
			'segment-03': { rank: 4125 },
			'segment-07': { rank: 4250 },
			'segment-08': { rank: 4500 },
			'segment-06': { rank: 5000 },
		})

		const {
			movedSegments: movedSegments3,
			notMovedSegments: notMovedSegments3,
			insertedSegments: insertedSegments3,
			deletedSegments: deletedSegments3,
		} = GetMovedSegments(
			['segment-05', 'segment-01', 'segment-02', 'segment-04', 'segment-03', 'segment-07', 'segment-08', 'segment-06'],
			iNewsRaw.map((s) => s.externalId)
		)
		result = ParsedINewsIntoSegments.GetRanks(
			rundownId,
			iNewsRaw.map((s) => s.externalId),
			previousRanks,
			movedSegments3,
			notMovedSegments3,
			insertedSegments3,
			deletedSegments3
		)
		segments = []
		for (let [segmentId, rank] of result.segmentRanks) {
			segments.push({ externalId: segmentId, rank })
		}
		expect(result).toEqual([
			{
				rank: 1000,
				externalId: 'segment-05',
			},
			{
				rank: 2000,
				externalId: 'segment-01',
			},
			{
				rank: 2500,
				externalId: 'segment-04',
			},
			{
				rank: 3000,
				externalId: 'segment-02',
			},
			{
				rank: 4125,
				externalId: 'segment-03',
			},
			{
				rank: 4500,
				externalId: 'segment-08',
			},
			{
				rank: 5000,
				externalId: 'segment-06',
			},
			{
				rank: 6000,
				externalId: 'segment-07',
			},
		])
	})

	it('Preserves ranks when a segment is deleted', () => {
		const iNewsRaw: ReducedSegment[] = [segmentGW01, segmentGW03, segmentGW04, segmentGW05]
		const rundownId = 'test-rundown'
		const previousRanks = makeSegmentRanks({
			'segment-01': { rank: 1000 },
			'segment-02': { rank: 2000 },
			'segment-03': { rank: 3000 },
			'segment-04': { rank: 4000 },
			'segment-05': { rank: 5000 },
		})

		const { movedSegments, notMovedSegments, insertedSegments, deletedSegments } = GetMovedSegments(
			['segment-01', 'segment-02', 'segment-03', 'segment-04', 'segment-05'],
			iNewsRaw.map((s) => s.externalId)
		)
		let result = ParsedINewsIntoSegments.GetRanks(
			rundownId,
			iNewsRaw.map((s) => s.externalId),
			previousRanks,
			movedSegments,
			notMovedSegments,
			insertedSegments,
			deletedSegments
		)
		let segments: Array<{ rank: number; externalId: SegmentId }> = []
		for (let [segmentId, rank] of result.segmentRanks) {
			segments.push({ externalId: segmentId, rank })
		}
		expect(result).toEqual([
			{
				rank: 1000,
				externalId: 'segment-01',
			},
			{
				rank: 3000,
				externalId: 'segment-03',
			},
			{
				rank: 4000,
				externalId: 'segment-04',
			},
			{
				rank: 5000,
				externalId: 'segment-05',
			},
		])

		const {
			movedSegments: movedSegments2,
			notMovedSegments: notMovedSegments2,
			insertedSegments: insertedSegments2,
			deletedSegments: deletedSegments2,
		} = GetMovedSegments(
			['segment-01', 'segment-02', 'segment-03'],
			iNewsRaw.map((s) => s.externalId)
		)
		result = ParsedINewsIntoSegments.GetRanks(
			rundownId,
			iNewsRaw.map((s) => s.externalId),
			previousRanks,
			movedSegments,
			notMovedSegments,
			insertedSegments,
			deletedSegments
		)
		segments = []
		for (let [segmentId, rank] of result.segmentRanks) {
			segments.push({ externalId: segmentId, rank })
		}
		expect(result).toEqual([
			{
				rank: 1000,
				externalId: 'segment-01',
			},
			{
				rank: 3000,
				externalId: 'segment-03',
			},
			{
				rank: 4000,
				externalId: 'segment-04',
			},
			{
				rank: 5000,
				externalId: 'segment-05',
			},
		])
	})
})
