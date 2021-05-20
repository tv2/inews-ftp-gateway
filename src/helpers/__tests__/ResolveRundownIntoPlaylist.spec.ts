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

describe('Resolve Rundown Into Playlist', () => {
	it('Creates a playlist with one rundown when no back-time is present', () => {
		let segments: Array<UnrankedSegment> = [
			createUnrankedSegment(1),
			createUnrankedSegment(2),
			createUnrankedSegment(3),
		]

		const result = ResolveRundownIntoPlaylist('test-playlist', segments)

		expect(result).toEqual(
			literal<ResolvedPlaylist>([
				{
					rundownId: 'test-playlist_1',
					segments: ['segment-01', 'segment-02', 'segment-03'],
				},
			])
		)
	})

	it('Splits with one segment with back-time', () => {
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
				},
				{
					rundownId: 'test-playlist_2',
					segments: ['segment-02'],
				},
				{
					rundownId: 'test-playlist_3',
					segments: ['segment-03'],
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
				},
				{
					rundownId: 'test-playlist_2',
					segments: [
						...Array.from({ length: numPer }, (_, i) => `segment-${(numPer + i).toString().padStart(2, '0')}`),
						`segment-${2 * numPer}`,
					],
				},
				{
					rundownId: 'test-playlist_3',
					segments: [
						...Array.from({ length: numPer }, (_, i) => `segment-${(2 * numPer + i).toString().padStart(2, '0')}`),
						`segment-${3 * numPer}`,
					],
				},
				{
					rundownId: 'test-playlist_4',
					segments: Array.from({ length: numPer }, (_, i) => `segment-${(3 * numPer + i).toString().padStart(2, '0')}`),
				},
			])
		)
	})
})
