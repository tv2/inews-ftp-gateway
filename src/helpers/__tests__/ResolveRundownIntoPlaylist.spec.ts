import { literal } from '../../helpers'
import { ResolvedPlaylist, ResolveRundownIntoPlaylist } from '../ResolveRundownIntoPlaylist'
import { UnrankedSegment } from '../../classes/RundownWatcher'
import { INewsStory, INewsFields } from 'inews'

type SegmentOptions = {
	backTime?: string
	cues?: (string[] | null)[]
	meta?: object
	body?: string
}

function createUnrankedSegment(num: number, { backTime, cues, meta, body }: SegmentOptions = {}): UnrankedSegment {
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
			meta: meta ?? {},
			cues: cues ?? [],
			body: body ?? '',
		}),
	})
}

function createContinuitySegment(num: number, { backTime, cues, meta, body }: SegmentOptions = {}): UnrankedSegment {
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
			meta: meta ?? {},
			cues: cues ?? [],
			body: body ?? '',
		}),
	})
}

function createKlarOnAirSegment(num: number, { backTime, cues, meta, body }: SegmentOptions = {}): UnrankedSegment {
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
			meta: meta ?? {},
			cues: cues ?? [],
			body: body ?? '',
		}),
	})
}

function createUnnamedSegment(
	num: number,
	segmentName: any,
	{ cues, meta, body }: SegmentOptions = {}
): UnrankedSegment {
	let id = num.toString().padStart(2, '0')
	return literal<UnrankedSegment>({
		externalId: `segment-${id}`,
		name: segmentName,
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
			meta: meta ?? {},
			cues: cues ?? [],
			body: body ?? '',
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
					payload: { rank: 0 },
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
			createContinuitySegment(4, { backTime: '@1234' }),
		]

		const result = ResolveRundownIntoPlaylist('test-playlist', segments)

		expect(result).toEqual({
			resolvedPlaylist: literal<ResolvedPlaylist>([
				{
					rundownId: 'test-playlist_1',
					segments: ['segment-01', 'segment-02', 'segment-03', 'segment-04'],
					backTime: '@1234',
					payload: { rank: 0 },
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
			createContinuitySegment(4, { backTime: '@1234' }),
			createUnrankedSegment(5),
		]

		const result = ResolveRundownIntoPlaylist('test-playlist', segments)

		expect(result).toEqual({
			resolvedPlaylist: literal<ResolvedPlaylist>([
				{
					rundownId: 'test-playlist_1',
					segments: ['segment-01', 'segment-02', 'segment-03', 'segment-04', 'segment-05'],
					backTime: '@1234',
					payload: { rank: 0 },
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
			createContinuitySegment(4, { backTime: '@1234' }),
			createUnrankedSegment(5),
			createContinuitySegment(6, { backTime: '@5678' }),
		]

		const result = ResolveRundownIntoPlaylist('test-playlist', segments)

		expect(result).toEqual({
			resolvedPlaylist: literal<ResolvedPlaylist>([
				{
					rundownId: 'test-playlist_1',
					segments: ['segment-01', 'segment-02', 'segment-03', 'segment-04', 'segment-05', 'segment-06'],
					backTime: '@1234',
					payload: { rank: 0 },
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
			createContinuitySegment(6, { backTime: '@5678' }),
		]

		const result = ResolveRundownIntoPlaylist('test-playlist', segments)

		expect(result).toEqual({
			resolvedPlaylist: literal<ResolvedPlaylist>([
				{
					rundownId: 'test-playlist_1',
					segments: ['segment-01', 'segment-02', 'segment-03', 'segment-04', 'segment-05', 'segment-06'],
					payload: { rank: 0 },
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
					payload: { rank: 0 },
				},
			]),
			untimedSegments: new Set(['segment-02']),
		})
	})

	it('tests that a segment with blank name does not break the parser', () => {
		let segments: Array<UnrankedSegment> = [createUnnamedSegment(1, '')]

		const result = ResolveRundownIntoPlaylist('test-playlist', segments)

		expect(result).toEqual({
			resolvedPlaylist: literal<ResolvedPlaylist>([
				{
					rundownId: 'test-playlist_1',
					segments: ['segment-01'],
					payload: { rank: 0 },
				},
			]),
			untimedSegments: new Set([]),
		})
	})

	it('tests that a segment with undefined name does not break the parser', () => {
		let segments: Array<UnrankedSegment> = [createUnnamedSegment(1, undefined)]

		const result = ResolveRundownIntoPlaylist('test-playlist', segments)

		expect(result).toEqual({
			resolvedPlaylist: literal<ResolvedPlaylist>([
				{
					rundownId: 'test-playlist_1',
					segments: ['segment-01'],
					payload: { rank: 0 },
				},
			]),
			untimedSegments: new Set([]),
		})
	})

	// Note: Disabling rundowns temporarily for v42.0.
	// it('tests that a KLAR ON AIR with ShowstyleVariant sets the rundown showstyleVariant', () => {
	// 	const segments = [
	// 		createKlarOnAirSegment(1, {
	// 			cues: ['SOFIE=SHOWSTYLEVARIANT\nTV2 Nyhederne'.split('\n')],
	// 			body: '<p><a idref="0" /></p>',
	// 		}),
	// 	]
	// 	const resolvedPlayList = ResolveRundownIntoPlaylist('test-playlist', segments)

	// 	expect(resolvedPlayList).toEqual({
	// 		resolvedPlaylist: literal<ResolvedPlaylist>([
	// 			{
	// 				rundownId: 'test-playlist_1',
	// 				segments: ['segment-01'],
	// 				payload: { showstyleVariant: 'TV2 Nyhederne', rank: 0 },
	// 			},
	// 		]),
	// 		untimedSegments: new Set(['segment-01']),
	// 	})
	// })

	// it('tests that only the first KLAR ON AIR with ShowstyleVariant sets the rundown showstyleVariant', () => {
	// 	const segments = [
	// 		createKlarOnAirSegment(1, {
	// 			cues: ['SOFIE=SHOWSTYLEVARIANT\nTV2 Nyhederne'.split('\n'), null],
	// 			body: '<p><a idref="0" /></p>\n<p><a idref="1" /></p>',
	// 		}),
	// 		createUnrankedSegment(2),
	// 		createKlarOnAirSegment(3, {
	// 			cues: ['SOFIE=SHOWSTYLEVARIANT\nTV2 Sporten'.split('\n')],
	// 			body: '<p><a idref="0" /></p>',
	// 		}),
	// 	]
	// 	const resolvedPlayList = ResolveRundownIntoPlaylist('test-playlist', segments)

	// 	expect(resolvedPlayList).toEqual({
	// 		resolvedPlaylist: literal<ResolvedPlaylist>([
	// 			{
	// 				rundownId: 'test-playlist_1',
	// 				segments: ['segment-01', 'segment-02'],
	// 				payload: { showstyleVariant: 'TV2 Nyhederne', rank: 0 },
	// 			},
	// 			{
	// 				rundownId: 'test-playlist_2',
	// 				segments: ['segment-03'],
	// 				payload: { showstyleVariant: 'TV2 Sporten', rank: 1 },
	// 			},
	// 		]),
	// 		untimedSegments: new Set(['segment-01']),
	// 	})
	// })

	// it('tests that we can set showstyleVariant in non KLAR-ON-AIR stories', () => {
	// 	const segments = [
	// 		createUnrankedSegment(1, {
	// 			cues: ['SOFIE=SHOWSTYLEVARIANT\nTV2 Nyhederne'.split('\n')],
	// 			body: '<p><a idref="0" /></p>',
	// 		}),
	// 		createUnnamedSegment(2, '', {
	// 			cues: ['SOFIE=SHOWSTYLEVARIANT\nTV2 Sporten'.split('\n')],
	// 			body: '<p><a idref="0" /></p>',
	// 		}),
	// 	]
	// 	const resolvedPlayList = ResolveRundownIntoPlaylist('test-playlist', segments)

	// 	expect(resolvedPlayList).toEqual({
	// 		resolvedPlaylist: literal<ResolvedPlaylist>([
	// 			{
	// 				rundownId: 'test-playlist_1',
	// 				segments: ['segment-01'],
	// 				payload: { showstyleVariant: 'TV2 Nyhederne', rank: 0 },
	// 			},
	// 			{
	// 				rundownId: 'test-playlist_2',
	// 				segments: ['segment-02'],
	// 				payload: { showstyleVariant: 'TV2 Sporten', rank: 1 },
	// 			},
	// 		]),
	// 		untimedSegments: new Set([]),
	// 	})
	// })

	// it('tests that we only care about the first cue', () => {
	// 	const segments = [
	// 		createKlarOnAirSegment(1, {
	// 			cues: [
	// 				'SOFIE=SHOWSTYLEVARIANT\nTV2 Nyhederne'.split('\n'),
	// 				'DVE=SOMMERFUGL\nINP1=KAM 1\nINP2=KAM 2\nBYNAVN=ODENSE/KØBENHAVN\n'.split('\n'),
	// 				'SOFIE=SHOWSTYLEVARIANT\nTV2 Sporten'.split('\n'),
	// 				'SOFIE=SHOWSTYLEVARIANT\nTV2 News'.split('\n'),
	// 			],
	// 			body: '<p><a idref="0" /></p>\n<p><a idref="2" /></p>\n<p><a idref="3" /></p>\n<p><a idref="4" /></p>\n',
	// 		}),
	// 		createUnnamedSegment(2, '', {
	// 			cues: ['SOFIE=SHOWSTYLEVARIANT\nTV2 Sporten'.split('\n')],
	// 			body: '<p><a idref="0" /></p>',
	// 		}),
	// 	]
	// 	const resolvedPlayList = ResolveRundownIntoPlaylist('test-playlist', segments)

	// 	expect(resolvedPlayList).toEqual({
	// 		resolvedPlaylist: literal<ResolvedPlaylist>([
	// 			{
	// 				rundownId: 'test-playlist_1',
	// 				segments: ['segment-01'],
	// 				payload: { showstyleVariant: 'TV2 Nyhederne', rank: 0 },
	// 			},
	// 			{
	// 				rundownId: 'test-playlist_2',
	// 				segments: ['segment-02'],
	// 				payload: { showstyleVariant: 'TV2 Sporten', rank: 1 },
	// 			},
	// 		]),
	// 		untimedSegments: new Set(['segment-01']),
	// 	})
	// })

	// it('tests that we pick the first showstyle variant cue', () => {
	// 	const segments = [
	// 		createKlarOnAirSegment(1, {
	// 			cues: [
	// 				null,
	// 				'SOFIE=SHOWSTYLEVARIANT\nTV2 Nyhederne'.split('\n'),
	// 				'DVE=SOMMERFUGL\nINP1=KAM 1\nINP2=KAM 2\nBYNAVN=ODENSE/KØBENHAVN\n'.split('\n'),
	// 				null,
	// 				'SOFIE=SHOWSTYLEVARIANT\nTV2 Sporten'.split('\n'),
	// 				'SOFIE=SHOWSTYLEVARIANT\nTV2 News'.split('\n'),
	// 			],
	// 			body:
	// 				'<p>something</p>\n<p><a idref="4" /></p>\n<p><a idref="5" /></p>\n<p><a idref="1" /></p>\n<p><a idref="2" /></p>\n',
	// 		}),
	// 	]
	// 	const resolvedPlayList = ResolveRundownIntoPlaylist('test-playlist', segments)

	// 	expect(resolvedPlayList).toEqual({
	// 		resolvedPlaylist: literal<ResolvedPlaylist>([
	// 			{
	// 				rundownId: 'test-playlist_1',
	// 				segments: ['segment-01'],
	// 				payload: { showstyleVariant: 'TV2 Sporten', rank: 0 },
	// 			},
	// 		]),
	// 		untimedSegments: new Set(['segment-01']),
	// 	})
	// })

	// it('tests that we only care about non-floated segments', () => {
	// 	const segments = [
	// 		createUnrankedSegment(1),
	// 		createKlarOnAirSegment(2, {
	// 			cues: ['SOFIE=SHOWSTYLEVARIANT\nTV2 Nyhederne'.split('\n')],
	// 			body: '<p><a idref="0" /></p>',
	// 			meta: { float: true },
	// 		}),
	// 		createUnrankedSegment(3, {
	// 			cues: ['SOFIE=SHOWSTYLEVARIANT\nTV2 Sporten'.split('\n')],
	// 			body: '<p><a idref="0" /></p>',
	// 		}),
	// 	]
	// 	const resolvedPlayList = ResolveRundownIntoPlaylist('test-playlist', segments)

	// 	expect(resolvedPlayList).toEqual({
	// 		resolvedPlaylist: literal<ResolvedPlaylist>([
	// 			{
	// 				rundownId: 'test-playlist_1',
	// 				segments: ['segment-01', 'segment-02'],
	// 				payload: { rank: 0 },
	// 			},
	// 			{
	// 				rundownId: 'test-playlist_2',
	// 				segments: ['segment-03'],
	// 				payload: { showstyleVariant: 'TV2 Sporten', rank: 1 },
	// 			},
	// 		]),
	// 		untimedSegments: new Set(),
	// 	})
	// })

	// it('tests that an empty idref is not parsed.', () => {
	// 	const segments = [
	// 		createUnrankedSegment(1),
	// 		createKlarOnAirSegment(2, {
	// 			cues: ['SOFIE=SHOWSTYLEVARIANT\nTV2 Nyhederne'.split('\n')],
	// 			body: '<p><a idref="" /></p>',
	// 			meta: { float: true },
	// 		}),
	// 		createKlarOnAirSegment(3, {
	// 			cues: ['SOFIE=SHOWSTYLEVARIANT\nTV2 Sporten'.split('\n')],
	// 			body: '<p><a idref="" /></p>',
	// 		}),
	// 	]
	// 	const resolvedPlayList = ResolveRundownIntoPlaylist('test-playlist', segments)

	// 	expect(resolvedPlayList).toEqual({
	// 		resolvedPlaylist: literal<ResolvedPlaylist>([
	// 			{
	// 				rundownId: 'test-playlist_1',
	// 				segments: ['segment-01', 'segment-02', 'segment-03'],
	// 				payload: { rank: 0 },
	// 			},
	// 		]),
	// 		untimedSegments: new Set(['segment-03']),
	// 	})
	// })

	// it('tests that a non-digit idref is not parsed.', () => {
	// 	const segments = [
	// 		createUnrankedSegment(1),
	// 		createKlarOnAirSegment(2, {
	// 			cues: ['SOFIE=SHOWSTYLEVARIANT\nTV2 Nyhederne'.split('\n')],
	// 			body: '<p><a idref="hello" /></p>',
	// 			meta: { float: true },
	// 		}),
	// 		createKlarOnAirSegment(3, {
	// 			cues: ['SOFIE=SHOWSTYLEVARIANT\nTV2 Sporten'.split('\n')],
	// 			body: '<p><a idref="world" /></p>',
	// 		}),
	// 	]
	// 	const resolvedPlayList = ResolveRundownIntoPlaylist('test-playlist', segments)

	// 	expect(resolvedPlayList).toEqual({
	// 		resolvedPlaylist: literal<ResolvedPlaylist>([
	// 			{
	// 				rundownId: 'test-playlist_1',
	// 				segments: ['segment-01', 'segment-02', 'segment-03'],
	// 				payload: { rank: 0 },
	// 			},
	// 		]),
	// 		untimedSegments: new Set(['segment-03']),
	// 	})
	// })

	// it('tests that a non-digit (with digits) idref is not parsed.', () => {
	// 	const segments = [
	// 		createUnrankedSegment(1),
	// 		createKlarOnAirSegment(2, {
	// 			cues: ['SOFIE=SHOWSTYLEVARIANT\nTV2 Nyhederne'.split('\n')],
	// 			body: '<p><a idref="hello2" /></p>',
	// 			meta: { float: true },
	// 		}),
	// 		createKlarOnAirSegment(3, {
	// 			cues: ['SOFIE=SHOWSTYLEVARIANT\nTV2 Sporten'.split('\n')],
	// 			body: '<p><a idref="wor3ld" /></p>',
	// 		}),
	// 	]
	// 	const resolvedPlayList = ResolveRundownIntoPlaylist('test-playlist', segments)

	// 	expect(resolvedPlayList).toEqual({
	// 		resolvedPlaylist: literal<ResolvedPlaylist>([
	// 			{
	// 				rundownId: 'test-playlist_1',
	// 				segments: ['segment-01', 'segment-02', 'segment-03'],
	// 				payload: { rank: 0 },
	// 			},
	// 		]),
	// 		untimedSegments: new Set(['segment-03']),
	// 	})
	// })

	// it('tests that showstyle splits correctly even when having a non-empty floated segment prior.', () => {
	// 	const segments = [
	// 		createUnrankedSegment(1, {
	// 			body: '<p><a idref="0" /></p>',
	// 			meta: { float: true },
	// 		}),
	// 		createKlarOnAirSegment(2, {
	// 			cues: ['SOFIE=SHOWSTYLEVARIANT\nTV2 Nyhederne'.split('\n')],
	// 			body: '<p><a idref="0" /></p>',
	// 		}),
	// 		createKlarOnAirSegment(3, {
	// 			body: '<p><a idref="0" /></p>',
	// 		}),
	// 	]
	// 	const resolvedPlayList = ResolveRundownIntoPlaylist('test-playlist', segments)

	// 	expect(resolvedPlayList).toEqual({
	// 		resolvedPlaylist: literal<ResolvedPlaylist>([
	// 			{
	// 				rundownId: 'test-playlist_1',
	// 				segments: ['segment-01', 'segment-02', 'segment-03'],
	// 				payload: { showstyleVariant: 'TV2 Nyhederne', rank: 0 },
	// 			},
	// 		]),
	// 		untimedSegments: new Set(['segment-02']),
	// 	})
	// })
})
