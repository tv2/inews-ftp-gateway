import { literal } from '../../helpers'
import { ResolvedPlaylist, ResolveRundownIntoPlaylist } from '../ResolveRundownIntoPlaylist'
import { UnrankedSegment } from '../../classes/RundownWatcher'
import { INewsStory, INewsFields } from 'inews'

function createUnrankedSegment(num: number, backTime?: string): UnrankedSegment {
	let id = num.toString().padStart(2, '0')
	return literal<UnrankedSegment>({
		externalId: `segment-${id}`,
		name: `Segment ${id}`,
		modified: new Date(),
		locator: '',
		rundownId: 'test-rundown',
		iNewsStory: literal<INewsStory>({
			id,
			identifier: id,
			locator: '',
			fields: literal<INewsFields>({
				title: '',
				modifyDate: '',
				tapeTime: '',
				audioTime: '',
				totalTime: '',
				cumeTime: '',
				backTime,
			}),
			meta: {},
			cues: [],
			body: '',
		}),
	})
}

function createContinuitySegment(num: number, backTime?: string): UnrankedSegment {
	let id = num.toString().padStart(2, '0')
	return literal<UnrankedSegment>({
		externalId: `segment-${id}`,
		name: `CONTINUITY`,
		modified: new Date(),
		locator: '',
		rundownId: 'test-rundown',
		iNewsStory: literal<INewsStory>({
			id,
			identifier: id,
			locator: '',
			fields: literal<INewsFields>({
				title: '',
				modifyDate: '',
				tapeTime: '',
				audioTime: '',
				totalTime: '',
				cumeTime: '',
				backTime,
			}),
			meta: {},
			cues: [],
			body: '',
		}),
	})
}

function createKlarOnAirSegment(num: number, backTime?: string): UnrankedSegment {
	let id = num.toString().padStart(2, '0')
	return literal<UnrankedSegment>({
		externalId: `segment-${id}`,
		name: `Klar on air`,
		modified: new Date(),
		locator: '',
		rundownId: 'test-rundown',
		iNewsStory: literal<INewsStory>({
			id,
			identifier: id,
			locator: '',
			fields: literal<INewsFields>({
				title: '',
				modifyDate: '',
				tapeTime: '',
				audioTime: '',
				totalTime: '',
				cumeTime: '',
				backTime,
			}),
			meta: {},
			cues: [],
			body: '',
		}),
	})
}

function createUnnamedSegment(num: number): UnrankedSegment {
	let id = num.toString().padStart(2, '0')
	return literal<UnrankedSegment>({
		externalId: `segment-${id}`,
		name: '',
		modified: new Date(),
		locator: '',
		rundownId: 'test-rundown',
		iNewsStory: literal<INewsStory>({
			id,
			identifier: id,
			locator: '',
			fields: literal<INewsFields>({
				title: '',
				modifyDate: '',
				tapeTime: '',
				audioTime: '',
				totalTime: '',
				cumeTime: '',
			}),
			meta: {},
			cues: [],
			body: '',
		}),
	})
}

describe('Resolve Rundown Into Playlist', () => {
	it('Creates a playlist with one rundown when no back-time is present', () => {
		let segments: Array<UnrankedSegment> = [
			createUnrankedSegment(1),
			createUnrankedSegment(2),
			createUnrankedSegment(3),
		]

		const result = ResolveRundownIntoPlaylist('test-playlist', segments)

		expect(result).toEqual({
			resolvedPlaylist: literal<ResolvedPlaylist>([
				{
					rundownId: 'test-playlist_1',
					segments: ['segment-01', 'segment-02', 'segment-03'],
				},
			]),
			untimedSegments: new Set(),
		})
	})

	it('Sets the back time when a continuity story with back time is present', () => {
		let segments: Array<UnrankedSegment> = [
			createUnrankedSegment(1),
			createUnrankedSegment(2),
			createUnrankedSegment(3),
			createContinuitySegment(4, '@1234'),
		]

		const result = ResolveRundownIntoPlaylist('test-playlist', segments)

		expect(result).toEqual({
			resolvedPlaylist: literal<ResolvedPlaylist>([
				{
					rundownId: 'test-playlist_1',
					segments: ['segment-01', 'segment-02', 'segment-03', 'segment-04'],
					backTime: '@1234',
				},
			]),
			untimedSegments: new Set(['segment-04']),
		})
	})

	it('Sets the back time when continuity story is not last', () => {
		let segments: Array<UnrankedSegment> = [
			createUnrankedSegment(1),
			createUnrankedSegment(2),
			createUnrankedSegment(3),
			createContinuitySegment(4, '@1234'),
			createUnrankedSegment(5),
		]

		const result = ResolveRundownIntoPlaylist('test-playlist', segments)

		expect(result).toEqual({
			resolvedPlaylist: literal<ResolvedPlaylist>([
				{
					rundownId: 'test-playlist_1',
					segments: ['segment-01', 'segment-02', 'segment-03', 'segment-04', 'segment-05'],
					backTime: '@1234',
				},
			]),
			untimedSegments: new Set(['segment-04', 'segment-05']),
		})
	})

	it('Sets the back time to the first continuity story', () => {
		let segments: Array<UnrankedSegment> = [
			createUnrankedSegment(1),
			createUnrankedSegment(2),
			createUnrankedSegment(3),
			createContinuitySegment(4, '@1234'),
			createUnrankedSegment(5),
			createContinuitySegment(6, '@5678'),
		]

		const result = ResolveRundownIntoPlaylist('test-playlist', segments)

		expect(result).toEqual({
			resolvedPlaylist: literal<ResolvedPlaylist>([
				{
					rundownId: 'test-playlist_1',
					segments: ['segment-01', 'segment-02', 'segment-03', 'segment-04', 'segment-05', 'segment-06'],
					backTime: '@1234',
				},
			]),
			untimedSegments: new Set(['segment-04', 'segment-05', 'segment-06']),
		})
	})

	it('Setsno back time if continuity story does not have back time', () => {
		let segments: Array<UnrankedSegment> = [
			createUnrankedSegment(1),
			createUnrankedSegment(2),
			createUnrankedSegment(3),
			createContinuitySegment(4),
			createUnrankedSegment(5),
			createContinuitySegment(6, '@5678'),
		]

		const result = ResolveRundownIntoPlaylist('test-playlist', segments)

		expect(result).toEqual({
			resolvedPlaylist: literal<ResolvedPlaylist>([
				{
					rundownId: 'test-playlist_1',
					segments: ['segment-01', 'segment-02', 'segment-03', 'segment-04', 'segment-05', 'segment-06'],
				},
			]),
			untimedSegments: new Set(['segment-04', 'segment-05', 'segment-06']),
		})
	})

	it('Untimes only the first Klar-on-air segment', () => {
		let segments: Array<UnrankedSegment> = [
			createUnrankedSegment(1),
			createKlarOnAirSegment(2),
			createUnrankedSegment(3),
			createKlarOnAirSegment(4),
			createUnrankedSegment(5),
		]

		const result = ResolveRundownIntoPlaylist('test-playlist', segments)

		expect(result).toEqual({
			resolvedPlaylist: literal<ResolvedPlaylist>([
				{
					rundownId: 'test-playlist_1',
					segments: ['segment-01', 'segment-02', 'segment-03', 'segment-04', 'segment-05'],
				},
			]),
			untimedSegments: new Set(['segment-02']),
		})
	})

	it('tests that a segment with blank name does not break the parser', () => {
		let segments: Array<UnrankedSegment> = [createUnnamedSegment(1)]

		const result = ResolveRundownIntoPlaylist('test-playlist', segments)

		expect(result).toEqual({
			resolvedPlaylist: literal<ResolvedPlaylist>([
				{
					rundownId: 'test-playlist_1',
					segments: ['segment-01'],
				},
			]),
			untimedSegments: new Set([]),
		})
	})

	// todo - create object with undefined Segment name

	// TODO: Breaks, future work
	/*it('Splits with one segment with back-time', () => {
		let segments: Array<UnrankedSegment> = [
			createUnrankedSegment(1),
			createUnrankedSegment(2, '@1234'),
			createUnrankedSegment(3),
		]

		const result = ResolveRundownIntoPlaylist('test-playlist', segments)

		expect(result).toEqual(
			literal<ResolvedPlaylist>([
				{
					rundownId: 'test-playlist_1',
					segments: ['segment-01', 'segment-02'],
					backTime: '@1234',
				},
				{
					rundownId: 'test-playlist_2',
					segments: ['segment-03'],
				},
			])
		)
	})

	it('Splits when every segment has back-time', () => {
		let segments: Array<UnrankedSegment> = [
			createUnrankedSegment(1, '@1234'),
			createUnrankedSegment(2, '@1234'),
			createUnrankedSegment(3, '@1234'),
		]

		const result = ResolveRundownIntoPlaylist('test-playlist', segments)

		expect(result).toEqual(
			literal<ResolvedPlaylist>([
				{
					rundownId: 'test-playlist_1',
					segments: ['segment-01'],
					backTime: '@1234',
				},
				{
					rundownId: 'test-playlist_2',
					segments: ['segment-02'],
					backTime: '@1234',
				},
				{
					rundownId: 'test-playlist_3',
					segments: ['segment-03'],
					backTime: '@1234',
				},
			])
		)
	})

	it('Splits a large rundown', () => {
		let segments: Array<UnrankedSegment> = [
			...Array.from({ length: 100 }, (_, i) => createUnrankedSegment(i)),
			createUnrankedSegment(100, '@1234'),
			...Array.from({ length: 100 }, (_, i) => createUnrankedSegment(100 + i)),
		]

		const result = ResolveRundownIntoPlaylist('test-playlist', segments)

		expect(result).toEqual(
			literal<ResolvedPlaylist>([
				{
					rundownId: 'test-playlist_1',
					segments: [
						...Array.from({ length: 100 }, (_, i) => `segment-${i.toString().padStart(2, '0')}`),
						'segment-100',
					],
					backTime: '@1234',
				},
				{
					rundownId: 'test-playlist_2',
					segments: Array.from({ length: 100 }, (_, i) => `segment-${(100 + i).toString().padStart(2, '0')}`),
				},
			])
		)
	})

	it('Splits a really large rundown', () => {
		let numPer = 1000
		let segments: Array<UnrankedSegment> = [
			...Array.from({ length: numPer }, (_, i) => createUnrankedSegment(i)),
			createUnrankedSegment(numPer, '@1234'),
			...Array.from({ length: numPer }, (_, i) => createUnrankedSegment(numPer + i)),
			createUnrankedSegment(2 * numPer, '@1234'),
			...Array.from({ length: numPer }, (_, i) => createUnrankedSegment(2 * numPer + i)),
			createUnrankedSegment(3 * numPer, '@1234'),
			...Array.from({ length: numPer }, (_, i) => createUnrankedSegment(3 * numPer + i)),
		]

		const result = ResolveRundownIntoPlaylist('test-playlist', segments)

		expect(result).toEqual(
			literal<ResolvedPlaylist>([
				{
					rundownId: 'test-playlist_1',
					segments: [
						...Array.from({ length: numPer }, (_, i) => `segment-${i.toString().padStart(2, '0')}`),
						`segment-${numPer}`,
					],
					backTime: '@1234',
				},
				{
					rundownId: 'test-playlist_2',
					segments: [
						...Array.from({ length: numPer }, (_, i) => `segment-${(numPer + i).toString().padStart(2, '0')}`),
						`segment-${2 * numPer}`,
					],
					backTime: '@1234',
				},
				{
					rundownId: 'test-playlist_3',
					segments: [
						...Array.from({ length: numPer }, (_, i) => `segment-${(2 * numPer + i).toString().padStart(2, '0')}`),
						`segment-${3 * numPer}`,
					],
					backTime: '@1234',
				},
				{
					rundownId: 'test-playlist_4',
					segments: Array.from({ length: numPer }, (_, i) => `segment-${(3 * numPer + i).toString().padStart(2, '0')}`),
				},
			])
		)
	})*/
})
