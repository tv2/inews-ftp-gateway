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
	it('Finds the the next available rank', () => {
		const rundownId = 'test-rundown'
		const previousRanks: SegmentRankings = {
			[rundownId]: {
				'segment-01': { rank: 1000,position: 1 },
				'segment-02': { rank: 2000, position: 2 },
				'segment-03': { rank: 5000, position: 3 }
			}
		}

		let result = ParsedINewsIntoSegments.getNextAvailableRank(rundownId, previousRanks, [1000, 2000, 5000])
		expect(result).toEqual(1000)

		result = ParsedINewsIntoSegments.getNextAvailableRank(rundownId, previousRanks, [], undefined, 'segment-01')
		expect(result).toEqual(500)

		result = ParsedINewsIntoSegments.getNextAvailableRank(rundownId, previousRanks, [1000, 2000, 5000], 'segment-03')
		expect(result).toEqual(6000)

		result = ParsedINewsIntoSegments.getNextAvailableRank(rundownId, previousRanks, [1000], 'segment-01', 'segment-02')
		expect(result).toEqual(1500)

		result = ParsedINewsIntoSegments.getNextAvailableRank(rundownId, previousRanks, [1000, 2000, 1500], 'segment-01', 'segment-02')
		expect(result).toEqual(1750)

		result = ParsedINewsIntoSegments.getNextAvailableRank(rundownId, previousRanks, [1000, 2000], 'segment-02', 'segment-03')
		expect(result).toEqual(3500)
	})

	it('Finds deleted segments', () => {
		const result = ParsedINewsIntoSegments.getDeletedSegments(['segment-01', 'segment-02', 'segment-03', 'segment-04'], ['segment-01', 'segment-04', 'segment-03'])
		expect(result).toEqual(['segment-02'])
	})

	it('Finds new segments', () => {
		const result = ParsedINewsIntoSegments.getInsertedSegments(['segment-01', 'segment-02'], ['segment-01', 'segment-03', 'segment-02', 'segment-04'])
		expect(result).toEqual(['segment-03', 'segment-04'])
	})

	it('Finds moved segments', () => {
		let result = ParsedINewsIntoSegments.getMovedSegments(['segment-01', 'segment-02', 'segment-03'], ['segment-01', 'segment-03', 'segment-02'])
		expect(result).toEqual(['segment-02'])

		result = ParsedINewsIntoSegments.getMovedSegments(
			['segment-01', 'segment-02', 'segment-03'],
			['segment-01', 'segment-03', 'segment-04', 'segment-05', 'segment-02']
		)
		expect(result).toEqual(['segment-02'])
	})

	it('Assigns initial ranks', () => {
		const iNewsRaw: INewsStoryGW[] = [
			segmentGW01, segmentGW02, segmentGW03
		]
		const rundownId = 'test-rundown'

		const result = ParsedINewsIntoSegments.parse(rundownId, iNewsRaw, {}).map(res => { return { rank: res.rank, externalId: res.externalId } })
		expect(result).toEqual([
			{
				rank: 1000,
				externalId: 'segment-01'
			},
			{
				rank: 2000,
				externalId: 'segment-02'
			},
			{
				rank: 3000,
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
			[rundownId] : {
				'segment-01': { rank: 1, position: 1 },
				'segment-02': { rank: 2, position: 2 },
				'segment-03': { rank: 3, position: 3 }
			}
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
			[rundownId]: {
				'segment-01': { rank: 1, position: 1 },
				'segment-02': { rank: 2, position: 2 },
				'segment-03': { rank: 3, position: 3 }
			}
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

	it('Preserves existing ranks and creates new', () => {
		const iNewsRaw: INewsStoryGW[] = [
			segmentGW08, segmentGW01, segmentGW02, segmentGW03, segmentGW04, segmentGW05, segmentGW06, segmentGW07
		]
		const rundownId = 'test-rundown'
		const previousRanks: SegmentRankings = {
			[rundownId]: {
				'segment-01': { rank: 1000, position: 1 },
				'segment-02': { rank: 2000, position: 2 },
				'segment-03': { rank: 3000, position: 3 }
			}
		}

		const result = ParsedINewsIntoSegments.parse(rundownId, iNewsRaw, previousRanks).map(res => { return { rank: res.rank, externalId: res.externalId } })
		expect(result).toEqual([
			{
				rank: 500,
				externalId: 'segment-08'
			},
			{
				rank: 1000,
				externalId: 'segment-01'
			},
			{
				rank: 2000,
				externalId: 'segment-02'
			},
			{
				rank: 3000,
				externalId: 'segment-03'
			},
			{
				rank: 4000,
				externalId: 'segment-04'
			},
			{
				rank: 5000,
				externalId: 'segment-05'
			},
			{
				rank: 6000,
				externalId: 'segment-06'
			},
			{
				rank: 7000,
				externalId: 'segment-07'
			}
		])
	})

	it('Creates a new rank for a moved segment', () => {
		const iNewsRaw: INewsStoryGW[] = [
			segmentGW01, segmentGW03, segmentGW02
		]
		const rundownId = 'test-rundown'
		const previousRanks: SegmentRankings = {
			[rundownId]: {
				'segment-01': { rank: 1000,position: 1 },
				'segment-02': { rank: 2000,position: 2 },
				'segment-03': { rank: 3000,position: 3 }
			}
		}

		const result = ParsedINewsIntoSegments.parse(rundownId, iNewsRaw, previousRanks).map(res => { return { rank: res.rank, externalId: res.externalId } })
		expect(result).toEqual([
			{
				rank: 1000,
				externalId: 'segment-01'
			},
			{
				rank: 3000,
				externalId: 'segment-03'
			},
			{
				rank: 4000,
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
			[rundownId]: {
				'segment-01': { rank: 1000, position: 1 },
				'segment-02': { rank: 1500, position: 2 },
				'segment-03': { rank: 2000, position: 3 },
				'segment-04': { rank: 3000, position: 4 }
			}
		}

		const result = ParsedINewsIntoSegments.parse(rundownId, iNewsRaw, previousRanks).map(res => { return { rank: res.rank, externalId: res.externalId } })
		expect(result).toEqual([
			{
				rank: 1500,
				externalId: 'segment-02'
			},
			{
				rank: 2250, // (02 + 04) / 2
				externalId: 'segment-01'
			},
			{
				rank: 3000,
				externalId: 'segment-04'
			},
			{
				rank: 4000,
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
			[rundownId]: {
				'segment-05': { rank: 1000, position: 1 },
				'segment-01': { rank: 2000, position: 2 },
				'segment-02': { rank: 2500, position: 3 },
				'segment-03': { rank: 3000, position: 4 },
				'segment-04': { rank: 4000, position: 5 },
				'segment-06': { rank: 5000, position: 6 }
			}
		}

		const result = ParsedINewsIntoSegments.parse(rundownId, iNewsRaw, previousRanks).map(res => { return { rank: res.rank, externalId: res.externalId } })
		expect(result).toEqual([
			{
				rank: 1000,
				externalId: 'segment-05'
			},
			{
				rank: 2500,
				externalId: 'segment-02'
			},
			{
				rank: 3250,
				externalId: 'segment-01'
			},
			{
				rank: 4000,
				externalId: 'segment-04'
			},
			{
				rank: 4500,
				externalId: 'segment-03'
			},
			{
				rank: 5000,
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
			[rundownId]: {
				'segment-05': { rank: 1000, position: 1 }, // Stay
				'segment-01': { rank: 2000, position: 2 },
				'segment-02': { rank: 2500, position: 3 }, // Stay
				'segment-03': { rank: 3000, position: 4 },
				'segment-04': { rank: 4000, position: 5 }, // Stay
				'segment-06': { rank: 5000, position: 6 } // Stay
			}
		}

		const result = ParsedINewsIntoSegments.parse(rundownId, iNewsRaw, previousRanks).map(res => { return { rank: res.rank, externalId: res.externalId } })
		expect(result).toEqual([
			{
				rank: 1000,
				externalId: 'segment-05'
			},
			{
				rank: 2500,
				externalId: 'segment-02'
			},
			{
				rank: 3250,
				externalId: 'segment-01'
			},
			{
				rank: 4000,
				externalId: 'segment-04'
			},
			{
				rank: 4500,
				externalId: 'segment-03'
			},
			{
				rank: 4750,
				externalId: 'segment-07'
			},
			{
				rank: 4875,
				externalId: 'segment-08'
			},
			{
				rank: 5000,
				externalId: 'segment-06'
			}
		])
	})

	it('Preserves fractional previous ranks', () => {
		const iNewsRaw: INewsStoryGW[] = [
			segmentGW05, segmentGW02, segmentGW01, segmentGW04, segmentGW03, segmentGW07, segmentGW08, segmentGW06
		]
		const rundownId = 'test-rundown'
		const previousRanks: SegmentRankings = {
			[rundownId]: {
				'segment-05': { rank: 1000, position: 1 },
				'segment-02': { rank: 1500, position: 2 },
				'segment-01': { rank: 2000, position: 3 },
				'segment-04': { rank: 4000, position: 4 },
				'segment-03': { rank: 4125, position: 5 },
				'segment-07': { rank: 4250, position: 6 },
				'segment-08': { rank: 4500, position: 7 },
				'segment-06': { rank: 5000, position: 8 }
			}
		}

		const result = ParsedINewsIntoSegments.parse(rundownId, iNewsRaw, previousRanks).map(res => { return { rank: res.rank, externalId: res.externalId } })
		expect(result).toEqual([
			{
				rank: 1000,
				externalId: 'segment-05'
			},
			{
				rank: 1500,
				externalId: 'segment-02'
			},
			{
				rank: 2000,
				externalId: 'segment-01'
			},
			{
				rank: 4000,
				externalId: 'segment-04'
			},
			{
				rank: 4125,
				externalId: 'segment-03'
			},
			{
				rank: 4250,
				externalId: 'segment-07'
			},
			{
				rank: 4500,
				externalId: 'segment-08'
			},
			{
				rank: 5000,
				externalId: 'segment-06'
			}
		])
	})

	it('Handles multiple reorderings', () => {
		let iNewsRaw: INewsStoryGW[] = [
			segmentGW05, segmentGW02, segmentGW01, segmentGW04, segmentGW03, segmentGW07, segmentGW08, segmentGW06
		]
		const rundownId = 'test-rundown'
		let previousRanks: SegmentRankings = {
			[rundownId]: {
				'segment-05': { rank: 1000, position: 1 },
				'segment-02': { rank: 1500, position: 2 },
				'segment-01': { rank: 2000, position: 3 },
				'segment-04': { rank: 4000, position: 4 },
				'segment-03': { rank: 4125, position: 5 },
				'segment-07': { rank: 4250, position: 6 },
				'segment-08': { rank: 4500, position: 7 },
				'segment-06': { rank: 5000, position: 8 }
			}
		}

		let result = ParsedINewsIntoSegments.parse(rundownId, iNewsRaw, previousRanks).map(res => { return { rank: res.rank, externalId: res.externalId } })
		expect(result).toEqual([
			{
				rank: 1000,
				externalId: 'segment-05'
			},
			{
				rank: 1500,
				externalId: 'segment-02'
			},
			{
				rank: 2000,
				externalId: 'segment-01'
			},
			{
				rank: 4000,
				externalId: 'segment-04'
			},
			{
				rank: 4125,
				externalId: 'segment-03'
			},
			{
				rank: 4250,
				externalId: 'segment-07'
			},
			{
				rank: 4500,
				externalId: 'segment-08'
			},
			{
				rank: 5000,
				externalId: 'segment-06'
			}
		])

		iNewsRaw = [
			segmentGW05, segmentGW01, segmentGW02, segmentGW04, segmentGW03, segmentGW07, segmentGW08, segmentGW06
		]

		previousRanks = {
			[rundownId]: {
				'segment-05': { rank: 1000, position: 1 },
				'segment-02': { rank: 1500, position: 2 },
				'segment-01': { rank: 2000, position: 3 },
				'segment-04': { rank: 4000, position: 4 },
				'segment-03': { rank: 4125, position: 5 },
				'segment-07': { rank: 4250, position: 6 },
				'segment-08': { rank: 4500, position: 7 },
				'segment-06': { rank: 5000, position: 8 }
			}
		}

		result = ParsedINewsIntoSegments.parse(rundownId, iNewsRaw, previousRanks).map(res => { return { rank: res.rank, externalId: res.externalId } })
		expect(result).toEqual([
			{
				rank: 1000,
				externalId: 'segment-05'
			},
			{
				rank: 2000,
				externalId: 'segment-01'
			},
			{
				rank: 3000,
				externalId: 'segment-02'
			},
			{
				rank: 4000,
				externalId: 'segment-04'
			},
			{
				rank: 4125,
				externalId: 'segment-03'
			},
			{
				rank: 4250,
				externalId: 'segment-07'
			},
			{
				rank: 4500,
				externalId: 'segment-08'
			},
			{
				rank: 5000,
				externalId: 'segment-06'
			}
		])

		iNewsRaw = [
			segmentGW05, segmentGW01, segmentGW04, segmentGW02, segmentGW03, segmentGW08, segmentGW06, segmentGW07
		]

		previousRanks = {
			[rundownId]: {
				'segment-05': { rank: 1000, position: 1 },
				'segment-01': { rank: 2000, position: 3 },
				'segment-02': { rank: 3000, position: 2 },
				'segment-04': { rank: 4000, position: 4 },
				'segment-03': { rank: 4125, position: 5 },
				'segment-07': { rank: 4250, position: 6 },
				'segment-08': { rank: 4500, position: 7 },
				'segment-06': { rank: 5000, position: 8 }
			}
		}

		result = ParsedINewsIntoSegments.parse(rundownId, iNewsRaw, previousRanks).map(res => { return { rank: res.rank, externalId: res.externalId } })
		expect(result).toEqual([
			{
				rank: 1000,
				externalId: 'segment-05'
			},
			{
				rank: 2000,
				externalId: 'segment-01'
			},
			{
				rank: 4000,
				externalId: 'segment-04'
			},
			{
				rank: 4062.5,
				externalId: 'segment-02'
			},
			{
				rank: 4125,
				externalId: 'segment-03'
			},
			{
				rank: 4562.5,
				externalId: 'segment-08'
			},
			{
				rank: 5000,
				externalId: 'segment-06'
			},
			{
				rank: 6000,
				externalId: 'segment-07'
			}
		])
	})
})
