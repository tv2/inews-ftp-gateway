import { literal } from '../../helpers'
import { ResolvedPlaylistRundown, ResolveRundownIntoPlaylist } from '../ResolveRundownIntoPlaylist'
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
			resolvedRundown: literal<ResolvedPlaylistRundown>({
				rundownId: 'test-playlist_1',
				segments: ['segment-01', 'segment-02', 'segment-03'],
				payload: { rank: 0 },
			}),
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
			resolvedRundown: literal<ResolvedPlaylistRundown>({
				rundownId: 'test-playlist_1',
				segments: ['segment-01', 'segment-02', 'segment-03', 'segment-04'],
				backTime: '@1234',
				payload: { rank: 0 },
			}),
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
			resolvedRundown: literal<ResolvedPlaylistRundown>({
				rundownId: 'test-playlist_1',
				segments: ['segment-01', 'segment-02', 'segment-03', 'segment-04', 'segment-05'],
				backTime: '@1234',
				payload: { rank: 0 },
			}),
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
			resolvedRundown: literal<ResolvedPlaylistRundown>({
				rundownId: 'test-playlist_1',
				segments: ['segment-01', 'segment-02', 'segment-03', 'segment-04', 'segment-05', 'segment-06'],
				backTime: '@1234',
				payload: { rank: 0 },
			}),
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
			resolvedRundown: literal<ResolvedPlaylistRundown>({
				rundownId: 'test-playlist_1',
				segments: ['segment-01', 'segment-02', 'segment-03', 'segment-04', 'segment-05', 'segment-06'],
				payload: { rank: 0 },
			}),
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
			resolvedRundown: literal<ResolvedPlaylistRundown>({
				rundownId: 'test-playlist_1',
				segments: ['segment-01', 'segment-02', 'segment-03', 'segment-04', 'segment-05'],
				payload: { rank: 0 },
			}),
			untimedSegments: new Set(['segment-02']),
		})
	})

	it('tests that a segment with blank name does not break the parser', () => {
		let segments: Array<UnrankedSegment> = [createUnnamedSegment(1, '')]

		const result = ResolveRundownIntoPlaylist('test-playlist', segments)

		expect(result).toEqual({
			resolvedRundown: literal<ResolvedPlaylistRundown>({
				rundownId: 'test-playlist_1',
				segments: ['segment-01'],
				payload: { rank: 0 },
			}),
			untimedSegments: new Set([]),
		})
	})

	it('tests that a segment with undefined name does not break the parser', () => {
		let segments: Array<UnrankedSegment> = [createUnnamedSegment(1, undefined)]

		const result = ResolveRundownIntoPlaylist('test-playlist', segments)

		expect(result).toEqual({
			resolvedRundown: literal<ResolvedPlaylistRundown>({
				rundownId: 'test-playlist_1',
				segments: ['segment-01'],
				payload: { rank: 0 },
			}),
			untimedSegments: new Set([]),
		})
	})
})
