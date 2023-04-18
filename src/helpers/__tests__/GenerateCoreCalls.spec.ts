import { PlaylistChange, PlaylistChangeType } from '../DiffPlaylist'
import { CoreCall, CoreCallType, GenerateCoreCalls } from '../GenerateCoreCalls'
import { PlaylistId, SegmentId } from '../id'
import { ResolvedPlaylist } from '../ResolveRundownIntoPlaylist'
import { UnrankedSegment } from '../../classes/RundownWatcher'
import { literal } from '../../helpers'
import { INewsFields, INewsStory } from 'inews'

describe('GenerateCoreCalls', () => {
	it('generates metaData calls before segment updated calls', () => {
		const rundownExternalId: string = 'rundownExternalId'
		const segmentExternalId: string = 'segmentExternalId'
		const changes: PlaylistChange[] = [
			{
				type: PlaylistChangeType.PlaylistChangeRundownMetaDataUpdated,
				rundownExternalId,
			},
			{
				type: PlaylistChangeType.PlaylistChangeSegmentChanged,
				rundownExternalId,
				segmentExternalId,
			},
		]
		const playlistId: PlaylistId = 'playlistId'
		const playlistAssignments: ResolvedPlaylist = [
			{
				rundownId: rundownExternalId,
				segments: [],
			},
		]

		const assignedRanks: Map<SegmentId, number> = new Map()
		assignedRanks.set(segmentExternalId, 1)

		const iNewsDataCache: Map<SegmentId, UnrankedSegment> = new Map<SegmentId, UnrankedSegment>()
		iNewsDataCache.set(segmentExternalId, {
			rundownId: '',
			locator: '',
			externalId: '',
			name: '',
			modified: new Date(),
			iNewsStory: makeINewsStory(segmentExternalId),
			untimed: false
		})

		const result: CoreCall[] = GenerateCoreCalls(
			playlistId,
			changes,
			playlistAssignments,
			assignedRanks,
			iNewsDataCache,
			new Map()
		)

		expect(result).toHaveLength(2)
		expect(result[0].type).toEqual(CoreCallType.dataRundownMetaDataUpdate)
		expect(result[1].type).toEqual(CoreCallType.dataSegmentUpdate)
	})
})

function makeINewsStory(id: string, backTime?: string) {
	return literal<INewsStory>({
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
	})
}
