import { ProcessUpdatedRundown, RundownChangeType, RundownChangeSegmentCreate, RundownChangeSegmentDelete, RundownChangeSegmentUpdate, RundownChangeRundownCreate, RundownChangeRundownDelete, RundownChangeRundownUpdate } from '../RundownWatcher'
import { INewsRundown } from '../datastructures/Rundown'
import { RundownSegment, INewsStoryGW } from '../datastructures/Segment'
import { literal } from '../../helpers'

describe('Rundown Watcher', () => {
	it('Reports no changes when no changes occur', () => {
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
		const segments: RundownSegment[] = [
			new RundownSegment(
				'test-rundown',
				segmentGW01,
				'now',
				'test-rundown',
				0,
				'Test Segment 01',
				false
			)
		]

		const testRundown = new INewsRundown('test-rundown', 'Test Rundown', '', segments)

		const rundowns: { [name: string]: INewsRundown } = {
			'test-rundown': testRundown
		}

		const result = ProcessUpdatedRundown('test-rundown', testRundown, rundowns)

		expect(result).toEqual([])
	})

	it('Detects a new rundown', () => {
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
		const segments: RundownSegment[] = [
			new RundownSegment(
				'test-rundown',
				segmentGW01,
				'now',
				'test-rundown',
				0,
				'Test Segment 01',
				false
			)
		]

		const testRundown = new INewsRundown('test-rundown', 'Test Rundown', '', segments)

		const rundowns: { [name: string]: INewsRundown } = {}

		const result = ProcessUpdatedRundown('test-rundown', testRundown, rundowns)

		expect(result).toEqual([
			literal<RundownChangeRundownCreate>({
				type: RundownChangeType.RUNDOWN_CREATE,
				rundownExternalId: 'test-rundown'
			})
		])
	})

	it('Detects a deleted rundown', () => {
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
		const segments: RundownSegment[] = [
			new RundownSegment(
				'test-rundown',
				segmentGW01,
				'now',
				'test-rundown',
				0,
				'Test Segment 01',
				false
			)
		]

		const testRundown = new INewsRundown('test-rundown', 'Test Rundown', '', segments)

		const rundowns: { [name: string]: INewsRundown } = {
			'test-rundown': testRundown
		}

		const result = ProcessUpdatedRundown('test-rundown', null, rundowns)

		expect(result).toEqual([
			literal<RundownChangeRundownDelete>({
				type: RundownChangeType.RUNDOWN_DELETE,
				rundownExternalId: 'test-rundown'
			})
		])
	})

	it('Detects an updated rundown', () => {
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
		const segments: RundownSegment[] = [
			new RundownSegment(
				'test-rundown',
				segmentGW01,
				'now',
				'test-rundown',
				0,
				'Test Segment 01',
				false
			)
		]

		const testRundownBefore = new INewsRundown('test-rundown', 'Test Rundown Before', '', segments)
		const testRundownAfter = new INewsRundown('test-rundown', 'Test Rundown After', '', segments)

		const rundowns: { [name: string]: INewsRundown } = {
			'test-rundown': testRundownBefore
		}

		const result = ProcessUpdatedRundown('test-rundown', testRundownAfter, rundowns)

		expect(result).toEqual([
			literal<RundownChangeRundownUpdate>({
				type: RundownChangeType.RUNDOWN_UPDATE,
				rundownExternalId: 'test-rundown'
			})
		])
	})

	it('Detects a new segment', () => {
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

		const testRundownBefore = new INewsRundown('test-rundown', 'Test Rundown', '', [])
		const segments: RundownSegment[] = [
			new RundownSegment(
				'test-rundown',
				segmentGW01,
				'now',
				'segment-01',
				0,
				'Test Segment 01',
				false
			)
		]
		const testRundownAfter = new INewsRundown('test-rundown', 'Test Rundown', '', segments)

		const rundowns: { [name: string]: INewsRundown } = {
			'test-rundown': testRundownBefore
		}

		const result = ProcessUpdatedRundown('test-rundown', testRundownAfter, rundowns)

		expect(result).toEqual([
			literal<RundownChangeSegmentCreate>({
				type: RundownChangeType.SEGMENT_CREATE,
				rundownExternalId: 'test-rundown',
				segmentExternalId: 'segment-01'
			})
		])
	})

	it('Detects a deleted segment', () => {
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

		const segments: RundownSegment[] = [
			new RundownSegment(
				'test-rundown',
				segmentGW01,
				'now',
				'segment-01',
				0,
				'Test Segment 01',
				false
			)
		]
		const testRundownBefore = new INewsRundown('test-rundown', 'Test Rundown', '', segments)
		const testRundownAfter = new INewsRundown('test-rundown', 'Test Rundown', '', [])

		const rundowns: { [name: string]: INewsRundown } = {
			'test-rundown': testRundownBefore
		}

		const result = ProcessUpdatedRundown('test-rundown', testRundownAfter, rundowns)

		expect(result).toEqual([
			literal<RundownChangeSegmentDelete>({
				type: RundownChangeType.SEGMENT_DELETE,
				rundownExternalId: 'test-rundown',
				segmentExternalId: 'segment-01'
			})
		])
	})

	it('Detects an updated segment', () => {
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
			fileId: 'segment-01',
			id: 'segment-01',
			fields: {},
			meta: {
				words: '140',
				rate: '6'
			},
			cues: [],
			body: 'Some new body',
			identifier: 'segment-01'
		}

		const segmentsBefore: RundownSegment[] = [
			new RundownSegment(
				'test-rundown',
				segmentGW01,
				'now',
				'segment-01',
				0,
				'Test Segment 01',
				false
			)
		]

		const segmentsAfter: RundownSegment[] = [
			new RundownSegment(
				'test-rundown',
				segmentGW02,
				'now',
				'segment-01',
				0,
				'Test Segment 01',
				false
			)
		]
		const testRundownBefore = new INewsRundown('test-rundown', 'Test Rundown', '', segmentsBefore)
		const testRundownAfter = new INewsRundown('test-rundown', 'Test Rundown', '', segmentsAfter)

		const rundowns: { [name: string]: INewsRundown } = {
			'test-rundown': testRundownBefore
		}

		const result = ProcessUpdatedRundown('test-rundown', testRundownAfter, rundowns)

		expect(result).toEqual([
			literal<RundownChangeSegmentUpdate>({
				type: RundownChangeType.SEGMENT_UPDATE,
				rundownExternalId: 'test-rundown',
				segmentExternalId: 'segment-01'
			})
		])
	})

	it('Detects a segment move', () => {
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

		const segmentsBefore: RundownSegment[] = [
			new RundownSegment(
				'test-rundown',
				segmentGW01,
				'now',
				'segment-01',
				0,
				'Test Segment 01',
				false
			),
			new RundownSegment(
				'test-rundown',
				segmentGW02,
				'now',
				'segment-02',
				1,
				'Test Segment 02',
				false
			),
			new RundownSegment(
				'test-rundown',
				segmentGW03,
				'now',
				'segment-03',
				2,
				'Test Segment 03',
				false
			)
		]

		const segmentsAfter: RundownSegment[] = [
			new RundownSegment(
				'test-rundown',
				segmentGW01,
				'now',
				'segment-01',
				0,
				'Test Segment 01',
				false
			),
			new RundownSegment(
				'test-rundown',
				segmentGW03,
				'now',
				'segment-03',
				1.5,
				'Test Segment 03',
				false
			),
			new RundownSegment(
				'test-rundown',
				segmentGW02,
				'now',
				'segment-02',
				1,
				'Test Segment 02',
				false
			)
		]
		const testRundownBefore = new INewsRundown('test-rundown', 'Test Rundown', '', segmentsBefore)
		const testRundownAfter = new INewsRundown('test-rundown', 'Test Rundown', '', segmentsAfter)

		const rundowns: { [name: string]: INewsRundown } = {
			'test-rundown': testRundownBefore
		}

		const result = ProcessUpdatedRundown('test-rundown', testRundownAfter, rundowns)

		expect(result).toEqual([
			literal<RundownChangeSegmentUpdate>({
				type: RundownChangeType.SEGMENT_UPDATE,
				rundownExternalId: 'test-rundown',
				segmentExternalId: 'segment-03'
			})
		])
	})
})
