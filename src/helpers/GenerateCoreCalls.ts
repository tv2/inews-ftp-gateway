import { IngestRundown, IngestSegment } from '@sofie-automation/blueprints-integration'
import { INGEST_RUNDOWN_TYPE, MutatedSegment } from '../mutate'
import { UnrankedSegment } from '../classes/RundownWatcher'
import { literal } from '../helpers'
import { logger } from '../logger'
import {
	PlaylistChange,
	PlaylistChangeRundownCreated,
	PlaylistChangeRundownDeleted,
	PlaylistChangeRundownUpdated,
	PlaylistChangeSegmentChanged,
	PlaylistChangeSegmentCreated,
	PlaylistChangeSegmentDeleted,
	PlaylistChangeSegmentMoved,
	PlaylistChangeType,
} from './DiffPlaylist'
import { PlaylistId, RundownId, SegmentId } from './id'
import { ResolvedPlaylist } from './ResolveRundownIntoPlaylist'
import { RundownSegment } from '../classes/datastructures/Segment'

export enum CoreCallType {
	dataSegmentCreate = 'dataSegmentCreate',
	dataSegmentDelete = 'dataSegmentDelete',
	dataSegmentUpdate = 'dataSegmentUpdate',
	dataRundownCreate = 'dataRundownCreate',
	dataRundownDelete = 'dataRundownDelete',
	dataRundownUpdate = 'dataRundownUpdate',
	dataSegmentRanksUpdate = 'dataSegmentRanksUpdate',
}

export interface CoreCallBase {
	type: CoreCallType
	rundownExternalId: RundownId
}

export interface CoreCallSegmentCreate extends CoreCallBase {
	type: CoreCallType.dataSegmentCreate
	segmentExternalId: SegmentId
	segment: IngestSegment
}

export interface CoreCallSegmentDelete extends CoreCallBase {
	type: CoreCallType.dataSegmentDelete
	segmentExternalId: SegmentId
}

export interface CoreCallSegmentUpdate extends CoreCallBase {
	type: CoreCallType.dataSegmentUpdate
	segmentExternalId: SegmentId
	segment: IngestSegment
}

export interface CoreCallRundownCreate extends CoreCallBase {
	type: CoreCallType.dataRundownCreate
	rundown: IngestRundown
}

export interface CoreCallRundownDelete extends CoreCallBase {
	type: CoreCallType.dataRundownDelete
}

export interface CoreCallRundownUpdate extends CoreCallBase {
	type: CoreCallType.dataRundownUpdate
	rundown: IngestRundown
}

export interface CoreCallSegmentRanksUpdate extends CoreCallBase {
	type: CoreCallType.dataSegmentRanksUpdate
	ranks: { [segmentId: string]: number }
}

export type CoreCall =
	| CoreCallSegmentCreate
	| CoreCallSegmentDelete
	| CoreCallSegmentUpdate
	| CoreCallRundownCreate
	| CoreCallRundownDelete
	| CoreCallRundownUpdate
	| CoreCallSegmentRanksUpdate

export function GenerateCoreCalls(
	playlistId: PlaylistId,
	changes: PlaylistChange[],
	playlistAssignments: ResolvedPlaylist,
	assignedRanks: Map<SegmentId, number>,
	iNewsDataCache: Map<SegmentId, UnrankedSegment>,
	// TODO: This should probably just be a map of the previous known ranks
	ingestCacheData: Map<SegmentId, RundownSegment>
): CoreCall[] {
	const calls: CoreCall[] = []

	const playlistDeletedRundowns: PlaylistChangeRundownDeleted[] = changes.filter(
		(f) => f.type === PlaylistChangeType.PlaylistChangeRundownDeleted
	) as PlaylistChangeRundownDeleted[]
	let playlistCreatedRundowns: PlaylistChangeRundownCreated[] = changes.filter(
		(f) => f.type === PlaylistChangeType.PlaylistChangeRundownCreated
	) as PlaylistChangeRundownCreated[]
	const playlistUpdatedRundowns: PlaylistChangeRundownUpdated[] = changes.filter(
		(f) => f.type === PlaylistChangeType.PlaylistChangeRundownUpdated
	) as PlaylistChangeRundownUpdated[]
	let playlistChangedSegments: Array<
		PlaylistChangeSegmentMoved | PlaylistChangeSegmentCreated | PlaylistChangeSegmentChanged
	> = changes.filter((f) => f.type === PlaylistChangeType.PlaylistChangeSegmentChanged) as Array<
		PlaylistChangeSegmentMoved | PlaylistChangeSegmentCreated | PlaylistChangeSegmentChanged
	>
	let playlistDeletedSegment: PlaylistChangeSegmentDeleted[] = changes.filter(
		(f) => f.type === PlaylistChangeType.PlaylistChangeSegmentDeleted
	) as PlaylistChangeSegmentDeleted[]
	let playlistCreatedSegments: PlaylistChangeSegmentCreated[] = changes.filter(
		(f) => f.type === PlaylistChangeType.PlaylistChangeSegmentCreated
	) as PlaylistChangeSegmentCreated[]
	let playlistMovedSegments: PlaylistChangeSegmentMoved[] = changes.filter(
		(f) => f.type === PlaylistChangeType.PlaylistChangeSegmentMoved
	) as PlaylistChangeSegmentMoved[]

	for (let rundown of playlistDeletedRundowns) {
		calls.push(
			literal<CoreCallRundownDelete>({
				type: CoreCallType.dataRundownDelete,
				rundownExternalId: rundown.rundownExternalId,
			})
		)

		playlistChangedSegments = playlistChangedSegments.filter((s) => s.rundownExternalId !== rundown.rundownExternalId)
		playlistDeletedSegment = playlistDeletedSegment.filter((s) => s.rundownExternalId !== rundown.rundownExternalId)
		playlistCreatedSegments = playlistCreatedSegments.filter((s) => s.rundownExternalId !== rundown.rundownExternalId)
		playlistMovedSegments = playlistMovedSegments.filter((s) => s.rundownExternalId !== rundown.rundownExternalId)
	}

	for (let segment of playlistDeletedSegment) {
		calls.push(
			literal<CoreCallSegmentDelete>({
				type: CoreCallType.dataSegmentDelete,
				rundownExternalId: segment.rundownExternalId,
				segmentExternalId: segment.segmentExternalId,
			})
		)
	}

	for (let createdRundown of playlistCreatedRundowns) {
		logger.debug(`Creating rundown: ${createdRundown.rundownExternalId}`)
		const assignedRundown = playlistAssignments.find((r) => r.rundownId === createdRundown.rundownExternalId)

		if (!assignedRundown) {
			logger.error(
				`Tried to create rundown ${createdRundown.rundownExternalId} but could not find the segments associated with this rundown.`
			)
			continue
		}

		const rundown = playlistRundownToIngestRundown(
			playlistId,
			assignedRundown.rundownId,
			assignedRundown.segments,
			iNewsDataCache,
			assignedRanks,
			assignedRundown.backTime
		)

		if (rundown.payload.backTime) {
			logger.debug(`Create with backTime: ${rundown.payload.backTime}`)
		}
		calls.push(
			literal<CoreCallRundownCreate>({
				type: CoreCallType.dataRundownCreate,
				rundownExternalId: rundown.externalId,
				rundown,
			})
		)

		playlistChangedSegments = playlistChangedSegments.filter(
			(s) => s.rundownExternalId !== createdRundown.rundownExternalId
		)
		playlistCreatedSegments = playlistCreatedSegments.filter(
			(s) => s.rundownExternalId !== createdRundown.rundownExternalId
		)
		playlistMovedSegments = playlistMovedSegments.filter(
			(s) => s.rundownExternalId !== createdRundown.rundownExternalId
		)
	}

	for (let updatedRundown of playlistUpdatedRundowns) {
		const assignedRundown = playlistAssignments.find((r) => r.rundownId === updatedRundown.rundownExternalId)

		if (!assignedRundown) {
			logger.error(
				`Tried to create rundown ${updatedRundown.rundownExternalId} but could not find the segments associated with this rundown.`
			)
			continue
		}

		const rundown = playlistRundownToIngestRundown(
			playlistId,
			assignedRundown.rundownId,
			assignedRundown.segments,
			iNewsDataCache,
			assignedRanks,
			assignedRundown.backTime
		)
		if (rundown.payload.backTime) {
			logger.debug(`Update with backTime: ${rundown.payload.backTime}`)
		}

		calls.push(
			literal<CoreCallRundownUpdate>({
				type: CoreCallType.dataRundownUpdate,
				rundownExternalId: rundown.externalId,
				rundown,
			})
		)

		playlistChangedSegments = playlistChangedSegments.filter(
			(s) => s.rundownExternalId !== updatedRundown.rundownExternalId
		)
		playlistCreatedSegments = playlistCreatedSegments.filter(
			(s) => s.rundownExternalId !== updatedRundown.rundownExternalId
		)
		playlistMovedSegments = playlistMovedSegments.filter(
			(s) => s.rundownExternalId !== updatedRundown.rundownExternalId
		)
	}

	for (const changedSegment of playlistChangedSegments) {
		const segmentId = changedSegment.segmentExternalId
		const rundownId = changedSegment.rundownExternalId
		const inews = iNewsDataCache.get(changedSegment.segmentExternalId)
		let rank = assignedRanks.get(segmentId)
		const cachedData = ingestCacheData.get(segmentId)

		if (!inews) {
			logger.error(`Could not process segment change ${segmentId}, iNews data could not be found`)
			continue
		}

		if (rank === undefined) {
			logger.error(`Could not assign rank to ${segmentId}, it will appear out of order`)
			// Try to keep old position, otherwise send to top
			rank = cachedData?.rank ?? 0
		}

		const segment = inewsToIngestSegment(rundownId, segmentId, inews, rank)
		calls.push(
			literal<CoreCallSegmentUpdate>({
				type: CoreCallType.dataSegmentUpdate,
				rundownExternalId: rundownId,
				segmentExternalId: segmentId,
				segment,
			})
		)
	}

	for (const createdSegment of playlistCreatedSegments) {
		const segmentId = createdSegment.segmentExternalId
		const rundownId = createdSegment.rundownExternalId
		const inews = iNewsDataCache.get(createdSegment.segmentExternalId)
		let rank = assignedRanks.get(segmentId)
		const cachedData = ingestCacheData.get(segmentId)

		if (!inews) {
			logger.error(`Could not process created segment ${segmentId}, iNews data could not be found`)
			continue
		}

		if (rank == undefined) {
			logger.error(`Could not assign rank to ${segmentId}, it will appear out of order`)
			// Try to keep old position, otherwise send to top
			rank = cachedData?.rank ?? 0
		}

		const segment = inewsToIngestSegment(rundownId, segmentId, inews, rank)
		calls.push(
			literal<CoreCallSegmentCreate>({
				type: CoreCallType.dataSegmentCreate,
				rundownExternalId: rundownId,
				segmentExternalId: segment.externalId,
				segment,
			})
		)
	}

	const updatedRanks: Map<RundownId, { [segmentId: string]: number }> = new Map()

	for (let movedSegment of playlistMovedSegments) {
		const segmentId = movedSegment.segmentExternalId
		const rundownId = movedSegment.rundownExternalId
		let rank = assignedRanks.get(segmentId)
		const cachedData = ingestCacheData.get(segmentId)

		if (rank == undefined) {
			logger.error(`Could not assign rank to ${segmentId}, it will appear out of order`)
			// Try to keep old position, otherwise send to top
			rank = cachedData?.rank ?? 0
		}

		let rundownRanks = updatedRanks.get(rundownId) ?? {}
		rundownRanks[segmentId] = rank
		updatedRanks.set(rundownId, rundownRanks)
	}

	for (let [rundownId, ranks] of updatedRanks) {
		calls.push(
			literal<CoreCallSegmentRanksUpdate>({
				type: CoreCallType.dataSegmentRanksUpdate,
				rundownExternalId: rundownId,
				ranks,
			})
		)
	}

	return calls
}

function playlistRundownToIngestRundown(
	playlistId: PlaylistId,
	rundownId: RundownId,
	segments: string[],
	inewsCache: Map<SegmentId, UnrankedSegment>,
	ranks: Map<SegmentId, number>,
	backTime: string | undefined
): IngestRundown {
	let ingestSegments: IngestSegment[] = []

	for (let segmentId of segments) {
		const inews = inewsCache.get(segmentId)
		const rank = ranks.get(segmentId)

		if (!inews) {
			logger.error(`No iNews data for ${segmentId}`)
		}

		if (!rank) {
			logger.error(`No rank data for ${segmentId}`)
		}

		if (inews === undefined || rank === undefined) {
			logger.error(`Dropping segment ${segmentId} from rundown ${rundownId}`)
			continue
		}

		ingestSegments.push(inewsToIngestSegment(rundownId, segmentId, inews, rank))
	}

	return literal<IngestRundown>({
		externalId: rundownId,
		name: playlistId,
		type: INGEST_RUNDOWN_TYPE,
		segments: ingestSegments,
		payload: {
			playlistExternalId: playlistId,
			backTime,
		},
	})
}

function inewsToIngestSegment(
	rundownId: RundownId,
	segmentId: SegmentId,
	inews: UnrankedSegment,
	rank: number
): IngestSegment {
	return literal<IngestSegment>({
		externalId: segmentId,
		name: inews.name,
		rank,
		parts: [],
		payload: literal<MutatedSegment>({
			modified: inews.modified,
			locator: inews.locator,
			rundownId,
			iNewsStory: inews.iNewsStory,
			float: !!inews.iNewsStory.meta.float,
		}),
	})
}
