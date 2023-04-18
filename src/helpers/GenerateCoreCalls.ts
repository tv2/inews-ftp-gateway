import { IngestRundown, IngestSegment } from '@sofie-automation/blueprints-integration'
import { INGEST_RUNDOWN_TYPE, MutatedSegment } from '../mutate'
import { UnrankedSegment } from '../classes/RundownWatcher'
import { literal } from '../helpers'
import { logger } from '../logger'
import {
	PlaylistChange,
	PlaylistChangeSegmentChanged,
	PlaylistChangeSegmentCreated,
	PlaylistChangeSegmentDeleted,
	PlaylistChangeSegmentMoved,
	PlaylistChangeType,
} from './DiffPlaylist'
import { PlaylistId, RundownId, SegmentId } from './id'
import { ResolvedPlaylist, ResolvedPlaylistRundown } from './ResolveRundownIntoPlaylist'
import { RundownSegment } from '../classes/datastructures/Segment'

export enum CoreCallType {
	dataSegmentCreate = 'dataSegmentCreate',
	dataSegmentDelete = 'dataSegmentDelete',
	dataSegmentUpdate = 'dataSegmentUpdate',
	dataRundownCreate = 'dataRundownCreate',
	dataRundownDelete = 'dataRundownDelete',
	dataRundownUpdate = 'dataRundownUpdate',
	dataRundownMetaDataUpdate = 'dataRundownMetaDataUpdate',
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

export interface CoreCallRundownMetaDataUpdate extends CoreCallBase {
	type: CoreCallType.dataRundownMetaDataUpdate
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
	| CoreCallRundownMetaDataUpdate
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
	const coreCalls: CoreCall[] = []

	coreCalls.push(...createDeletedRundownCoreCalls(changes))
	coreCalls.push(...createSegmentDeletedCoreCalls(changes))
	coreCalls.push(
		...createRundownCreateCoreCalls(
			changes,
			playlistAssignments,
			playlistId,
			iNewsDataCache,
			assignedRanks
		)
	)
	coreCalls.push(
		...createMetaDataUpdateCoreCalls(
			changes,
			playlistAssignments,
			playlistId,
			iNewsDataCache,
			assignedRanks
		)
	)
	coreCalls.push(
		...createSegmentChangedCoreCalls(changes, iNewsDataCache, assignedRanks, ingestCacheData)
	)
	coreCalls.push(
		...createSegmentCreatedCoreCalls(changes, iNewsDataCache, assignedRanks, ingestCacheData)
	)
	coreCalls.push(...createSegmentMovedCoreCalls(changes, assignedRanks, ingestCacheData))
	coreCalls.push(
		...createRundownUpdatedCoreCalls(
			changes,
			playlistAssignments,
			playlistId,
			iNewsDataCache,
			assignedRanks
		)
	)

	return coreCalls
}

function createSegmentMovedCoreCalls(
	changes: PlaylistChange[],
	assignedRanks: Map<SegmentId, number>,
	ingestCacheData: Map<SegmentId, RundownSegment>
): CoreCallSegmentRanksUpdate[] {
	const playlistMovedSegments: PlaylistChangeSegmentMoved[] = changes.filter(
		(playlistChange) => playlistChange.type === PlaylistChangeType.PlaylistChangeSegmentMoved
	) as PlaylistChangeSegmentMoved[]

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

	const coreCalls: CoreCallSegmentRanksUpdate[] = []
	for (let [rundownId, ranks] of updatedRanks) {
		logger.debug(`Adding core call: Segment ranks update (${rundownId})`)
		coreCalls.push(
			literal<CoreCallSegmentRanksUpdate>({
				type: CoreCallType.dataSegmentRanksUpdate,
				rundownExternalId: rundownId,
				ranks,
			})
		)
	}

	return coreCalls
}

function createDeletedRundownCoreCalls(changes: PlaylistChange[]): CoreCallRundownDelete[] {
	return changes
		.filter((playlistChange) => playlistChange.type === PlaylistChangeType.PlaylistChangeRundownDeleted)
		.map((playlistChange) => {
			logger.debug(`Adding core call: Rundown delete (${playlistChange.rundownExternalId})`)
			return literal<CoreCallRundownDelete>({
				type: CoreCallType.dataRundownDelete,
				rundownExternalId: playlistChange.rundownExternalId,
			})
		})
}

function createSegmentDeletedCoreCalls(changes: PlaylistChange[]): CoreCallSegmentDelete[] {
	return changes
		.filter((playlistChange) => playlistChange.type === PlaylistChangeType.PlaylistChangeSegmentDeleted)
		.map((playlistChange) => {
			const playlistChangeSegmentDeleted: PlaylistChangeSegmentDeleted = playlistChange as PlaylistChangeSegmentDeleted
			logger.debug(`Adding core call: Segment delete (${playlistChangeSegmentDeleted.segmentExternalId})`)
			return literal<CoreCallSegmentDelete>({
				type: CoreCallType.dataSegmentDelete,
				rundownExternalId: playlistChangeSegmentDeleted.rundownExternalId,
				segmentExternalId: playlistChangeSegmentDeleted.segmentExternalId,
			})
		})
}

function createRundownCreateCoreCalls(
	changes: PlaylistChange[],
	playlistAssignments: Array<ResolvedPlaylistRundown>,
	playlistId: string,
	iNewsDataCache: Map<SegmentId, UnrankedSegment>,
	assignedRanks: Map<SegmentId, number>
): CoreCallRundownCreate[] {
	return changes
		.filter((playlistChange) => playlistChange.type === PlaylistChangeType.PlaylistChangeRundownCreated)
		.map((playlistChange) => {
			logger.debug(`Creating rundown: ${playlistChange.rundownExternalId}`)
			const assignedRundown = playlistAssignments.find(
				(playlistAssignment) => playlistAssignment.rundownId === playlistChange.rundownExternalId
			)

			if (!assignedRundown) {
				logger.error(
					`Tried to create rundown ${playlistChange.rundownExternalId} but could not find the segments associated with this rundown.`
				)
				return undefined
			}

			const rundown = playlistRundownToIngestRundown(
				playlistId,
				assignedRundown.rundownId,
				assignedRundown.segments,
				assignedRundown.payload,
				iNewsDataCache,
				assignedRanks,
			)

			logger.debug(`Adding core call: Rundown create (${rundown.externalId})`)
			return literal<CoreCallRundownCreate>({
				type: CoreCallType.dataRundownCreate,
				rundownExternalId: rundown.externalId,
				rundown,
			})
		})
		.filter((coreCall): coreCall is CoreCallRundownCreate => !!coreCall)
}

function createMetaDataUpdateCoreCalls(
	changes: PlaylistChange[],
	playlistAssignments: Array<ResolvedPlaylistRundown>,
	playlistId: string,
	iNewsDataCache: Map<SegmentId, UnrankedSegment>,
	assignedRanks: Map<SegmentId, number>
): CoreCallRundownMetaDataUpdate[] {
	return changes
		.filter((playlistChange) => playlistChange.type === PlaylistChangeType.PlaylistChangeRundownMetaDataUpdated)
		.map((playlistChange) => {
			const assignedRundown = playlistAssignments.find((r) => r.rundownId === playlistChange.rundownExternalId)

			if (!assignedRundown) {
				logger.error(
					`Tried to create rundown ${playlistChange.rundownExternalId} but could not find the segments associated with this rundown.`
				)
				return undefined
			}

			const rundown = playlistRundownToIngestRundown(
				playlistId,
				assignedRundown.rundownId,
				assignedRundown.segments,
				assignedRundown.payload,
				iNewsDataCache,
				assignedRanks,
			)

			logger.debug(`Adding core call: Rundown metadata update (${rundown.externalId})`)
			return literal<CoreCallRundownMetaDataUpdate>({
				type: CoreCallType.dataRundownMetaDataUpdate,
				rundownExternalId: rundown.externalId,
				rundown,
			})
		})
		.filter((coreCall): coreCall is CoreCallRundownMetaDataUpdate => !!coreCall)
}

function createSegmentChangedCoreCalls(
	changes: PlaylistChange[],
	iNewsDataCache: Map<SegmentId, UnrankedSegment>,
	assignedRanks: Map<SegmentId, number>,
	ingestCacheData: Map<SegmentId, RundownSegment>
): CoreCallSegmentUpdate[] {
	return changes
		.filter((playlistChange) => playlistChange.type === PlaylistChangeType.PlaylistChangeSegmentChanged)
		.map((playlistChange) => {
			const change:
				| PlaylistChangeSegmentMoved
				| PlaylistChangeSegmentCreated
				| PlaylistChangeSegmentChanged = playlistChange as
				| PlaylistChangeSegmentMoved
				| PlaylistChangeSegmentCreated
				| PlaylistChangeSegmentChanged
			const segmentId = change.segmentExternalId
			const rundownId = change.rundownExternalId
			const inews = iNewsDataCache.get(change.segmentExternalId)
			let rank = assignedRanks.get(segmentId)
			const cachedData = ingestCacheData.get(segmentId)

			if (!inews) {
				logger.error(`Could not process segment change ${segmentId}, iNews data could not be found`)
				return undefined
			}

			if (rank === undefined) {
				logger.error(`Could not assign rank to ${segmentId}, it will appear out of order`)
				// Try to keep old position, otherwise send to top
				rank = cachedData?.rank ?? 0
			}

			logger.debug(`Adding core call: Segment update (${segmentId})`)
			const segment = inewsToIngestSegment(rundownId, segmentId, inews, rank)
			return literal<CoreCallSegmentUpdate>({
				type: CoreCallType.dataSegmentUpdate,
				rundownExternalId: rundownId,
				segmentExternalId: segmentId,
				segment,
			})
		})
		.filter((coreCall): coreCall is CoreCallSegmentUpdate => !!coreCall)
}

function createSegmentCreatedCoreCalls(
	changes: PlaylistChange[],
	iNewsDataCache: Map<SegmentId, UnrankedSegment>,
	assignedRanks: Map<SegmentId, number>,
	ingestCacheData: Map<SegmentId, RundownSegment>
): CoreCallSegmentCreate[] {
	return changes
		.filter((playlistChange) => playlistChange.type === PlaylistChangeType.PlaylistChangeSegmentCreated)
		.map((playlistChange) => {
			const change: PlaylistChangeSegmentCreated = playlistChange as PlaylistChangeSegmentCreated
			const segmentId = change.segmentExternalId
			const rundownId = change.rundownExternalId
			const inews = iNewsDataCache.get(change.segmentExternalId)
			let rank = assignedRanks.get(segmentId)
			const cachedData = ingestCacheData.get(segmentId)

			if (!inews) {
				logger.error(`Could not process created segment ${segmentId}, iNews data could not be found`)
				return undefined
			}

			if (rank == undefined) {
				logger.error(`Could not assign rank to ${segmentId}, it will appear out of order`)
				// Try to keep old position, otherwise send to top
				rank = cachedData?.rank ?? 0
			}

			logger.debug(`Adding core call: Segment create (${segmentId})`)
			const segment = inewsToIngestSegment(rundownId, segmentId, inews, rank)
			return literal<CoreCallSegmentCreate>({
				type: CoreCallType.dataSegmentCreate,
				rundownExternalId: rundownId,
				segmentExternalId: segment.externalId,
				segment,
			})
		})
		.filter((coreCall): coreCall is CoreCallSegmentCreate => !!coreCall)
}

function createRundownUpdatedCoreCalls(
	changes: PlaylistChange[],
	playlistAssignments: Array<ResolvedPlaylistRundown>,
	playlistId: string,
	iNewsDataCache: Map<SegmentId, UnrankedSegment>,
	assignedRanks: Map<SegmentId, number>
): CoreCallRundownUpdate[] {
	return changes
		.filter((playlistChange) => playlistChange.type === PlaylistChangeType.PlaylistChangeRundownUpdated)
		.map((playlistChange) => {
			const assignedRundown = playlistAssignments.find((r) => r.rundownId === playlistChange.rundownExternalId)

			if (!assignedRundown) {
				logger.error(
					`Tried to create rundown ${playlistChange.rundownExternalId} but could not find the segments associated with this rundown.`
				)
				return undefined
			}

			const rundown = playlistRundownToIngestRundown(
				playlistId,
				assignedRundown.rundownId,
				assignedRundown.segments,
				assignedRundown.payload,
				iNewsDataCache,
				assignedRanks
			)

			logger.debug(`Adding core call: Rundown updated (${rundown.externalId})`)
			return literal<CoreCallRundownUpdate>({
				type: CoreCallType.dataRundownUpdate,
				rundownExternalId: rundown.externalId,
				rundown,
			})
		})
		.filter((coreCall): coreCall is CoreCallRundownUpdate => !!coreCall)
}

function playlistRundownToIngestRundown(
	playlistId: PlaylistId,
	rundownId: RundownId,
	segments: string[],
	payload: object | undefined,
	inewsCache: Map<SegmentId, UnrankedSegment>,
	ranks: Map<SegmentId, number>
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
			...(payload ?? null),
			playlistExternalId: playlistId,
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
			untimed: inews.untimed,
		}),
	})
}
