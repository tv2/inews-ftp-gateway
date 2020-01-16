import { ParsedINewsIntoSegments, SegmentRankings } from '../ParsedINewsToSegments'
import { INewsStoryGW } from '../datastructures/Segment'

const segmentGW01: INewsStoryGW = {
	fileId: 'segment-01',
	id: 'segment-01',
	fields: {},
	meta: {
		words: '140',
		rate: '6'
	},
	cues: [],
	body: '',
	identifier: 'segment-01'
}

const segmentGW02: INewsStoryGW = {
	fileId: 'segment-02',
	id: 'segment-02',
	fields: {},
	meta: {
		words: '140',
		rate: '6'
	},
	cues: [],
	body: '',
	identifier: 'segment-02'
}

const segmentGW03: INewsStoryGW = {
	fileId: 'segment-03',
	id: 'segment-03',
	fields: {},
	meta: {
		words: '140',
		rate: '6'
	},
	cues: [],
	body: '',
	identifier: 'segment-03'
}

const segmentGW04: INewsStoryGW = {
	fileId: 'segment-04',
	id: 'segment-04',
	fields: {},
	meta: {
		words: '140',
		rate: '6'
	},
	cues: [],
	body: '',
	identifier: 'segment-04'
}

const segmentGW05: INewsStoryGW = {
	fileId: 'segment-05',
	id: 'segment-05',
	fields: {},
	meta: {
		words: '140',
		rate: '6'
	},
	cues: [],
	body: '',
	identifier: 'segment-05'
}

const segmentGW06: INewsStoryGW = {
	fileId: 'segment-06',
	id: 'segment-06',
	fields: {},
	meta: {
		words: '140',
		rate: '6'
	},
	cues: [],
	body: '',
	identifier: 'segment-06'
}

const segmentGW07: INewsStoryGW = {
	fileId: 'segment-07',
	id: 'segment-07',
	fields: {},
	meta: {
		words: '140',
		rate: '6'
	},
	cues: [],
	body: '',
	identifier: 'segment-07'
}

const segmentGW08: INewsStoryGW = {
	fileId: 'segment-08',
	id: 'segment-08',
	fields: {},
	meta: {
		words: '140',
		rate: '6'
	},
	cues: [],
	body: '',
	identifier: 'segment-08'
}

describe('ParsedINewsIntoSegments', () => {
	it('Finds the the next known rank', () => {
		const previousRanks: SegmentRankings = {
			'segment-01': 1,
			'segment-02': 2,
			'segment-03': 3
		}

		let result = ParsedINewsIntoSegments.findNextDefinedRank('segment-01', previousRanks)
		expect(result).toEqual(2)

		result = ParsedINewsIntoSegments.findNextDefinedRank('', previousRanks)
		expect(result).toEqual(1)

		result = ParsedINewsIntoSegments.findNextDefinedRank('segment-03', previousRanks)
		expect(result).toEqual(4)
	})

	it('Assignes initial ranks', () => {
		const iNewsRaw: INewsStoryGW[] = [
			segmentGW01, segmentGW02, segmentGW03
		]
		const rundownId = 'test-rundown'

		const result = ParsedINewsIntoSegments.parse(rundownId, iNewsRaw, {}).map(res => { return { rank: res.rank, externalId: res.externalId } })
		expect(result).toEqual([
			{
				rank: 1,
				externalId: 'segment-01'
			},
			{
				rank: 2,
				externalId: 'segment-02'
			},
			{
				rank: 3,
				externalId: 'segment-03'
			}
		])
	})

	it('Preserves existing ranks', () => {
		const iNewsRaw: INewsStoryGW[] = [
			segmentGW01, segmentGW02, segmentGW03
		]
		const rundownId = 'test-rundown'
		const previousRanks: SegmentRankings = {
			'segment-01': 1,
			'segment-02': 2,
			'segment-03': 3
		}

		const result = ParsedINewsIntoSegments.parse(rundownId, iNewsRaw, previousRanks).map(res => { return { rank: res.rank, externalId: res.externalId } })
		expect(result).toEqual([
			{
				rank: 1,
				externalId: 'segment-01'
			},
			{
				rank: 2,
				externalId: 'segment-02'
			},
			{
				rank: 3,
				externalId: 'segment-03'
			}
		])
	})

	it('Creates a new rank for a new segment', () => {
		const iNewsRaw: INewsStoryGW[] = [
			segmentGW01, segmentGW02, segmentGW04, segmentGW03
		]
		const rundownId = 'test-rundown'
		const previousRanks: SegmentRankings = {
			'segment-01': 1,
			'segment-02': 2,
			'segment-03': 3
		}

		const result = ParsedINewsIntoSegments.parse(rundownId, iNewsRaw, previousRanks).map(res => { return { rank: res.rank, externalId: res.externalId } })
		expect(result).toEqual([
			{
				rank: 1,
				externalId: 'segment-01'
			},
			{
				rank: 2,
				externalId: 'segment-02'
			},
			{
				rank: 2.5,
				externalId: 'segment-04'
			},
			{
				rank: 3,
				externalId: 'segment-03'
			}
		])
	})

	it('Creates a new rank for a moved segment', () => {
		const iNewsRaw: INewsStoryGW[] = [
			segmentGW01, segmentGW03, segmentGW02
		]
		const rundownId = 'test-rundown'
		const previousRanks: SegmentRankings = {
			'segment-01': 1,
			'segment-02': 2,
			'segment-03': 3
		}

		const result = ParsedINewsIntoSegments.parse(rundownId, iNewsRaw, previousRanks).map(res => { return { rank: res.rank, externalId: res.externalId } })
		expect(result).toEqual([
			{
				rank: 1,
				externalId: 'segment-01'
			},
			{
				rank: 1.5,
				externalId: 'segment-03'
			},
			{
				rank: 2,
				externalId: 'segment-02'
			}
		])
	})

	it('Handles more than one segment changing rank', () => {
		const iNewsRaw: INewsStoryGW[] = [
			segmentGW02, segmentGW01, segmentGW04, segmentGW03
		]
		const rundownId = 'test-rundown'
		const previousRanks: SegmentRankings = {
			'segment-01': 1,
			'segment-02': 1.5,
			'segment-03': 2,
			'segment-04': 3
		}

		const result = ParsedINewsIntoSegments.parse(rundownId, iNewsRaw, previousRanks).map(res => { return { rank: res.rank, externalId: res.externalId } })
		expect(result).toEqual([
			{
				rank: 0.5,
				externalId: 'segment-02'
			},
			{
				rank: 1,
				externalId: 'segment-01'
			},
			{
				rank: 3,
				externalId: 'segment-04'
			},
			{
				rank: 3.5,
				externalId: 'segment-03'
			}
		])
	})

	it('Handles more than one segment changing rank (with unaffected segments surrounding)', () => {
		const iNewsRaw: INewsStoryGW[] = [
			segmentGW05, segmentGW02, segmentGW01, segmentGW04, segmentGW03, segmentGW06
		]
		const rundownId = 'test-rundown'
		const previousRanks: SegmentRankings = {
			'segment-05': 1,
			'segment-01': 2,
			'segment-02': 2.5,
			'segment-03': 3,
			'segment-04': 4,
			'segment-06': 5
		}

		const result = ParsedINewsIntoSegments.parse(rundownId, iNewsRaw, previousRanks).map(res => { return { rank: res.rank, externalId: res.externalId } })
		expect(result).toEqual([
			{
				rank: 1,
				externalId: 'segment-05'
			},
			{
				rank: 1.5,
				externalId: 'segment-02'
			},
			{
				rank: 2,
				externalId: 'segment-01'
			},
			{
				rank: 4,
				externalId: 'segment-04'
			},
			{
				rank: 4.5,
				externalId: 'segment-03'
			},
			{
				rank: 5,
				externalId: 'segment-06'
			}
		])
	})

	it('Handles more than one segment changing rank (with segments inserted)', () => {
		const iNewsRaw: INewsStoryGW[] = [
			segmentGW05, segmentGW02, segmentGW01, segmentGW04, segmentGW03, segmentGW07, segmentGW08, segmentGW06
		]
		const rundownId = 'test-rundown'
		const previousRanks: SegmentRankings = {
			'segment-05': 1,
			'segment-01': 2,
			'segment-02': 2.5,
			'segment-03': 3,
			'segment-04': 4,
			'segment-06': 5
		}

		const result = ParsedINewsIntoSegments.parse(rundownId, iNewsRaw, previousRanks).map(res => { return { rank: res.rank, externalId: res.externalId } })
		// console.log(result)
		expect(result).toEqual([
			{
				rank: 1,
				externalId: 'segment-05'
			},
			{
				rank: 1.5,
				externalId: 'segment-02'
			},
			{
				rank: 2,
				externalId: 'segment-01'
			},
			{
				rank: 2.5001,
				externalId: 'segment-04'
			},
			{
				rank: 3,
				externalId: 'segment-03'
			},
			{
				rank: 3.5,
				externalId: 'segment-07'
			},
			{
				rank: 3.75,
				externalId: 'segment-08'
			},
			{
				rank: 5,
				externalId: 'segment-06'
			}
		])
	})
})
