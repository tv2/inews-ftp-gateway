import { EventEmitter } from 'events'
import * as dotenv from 'dotenv'
import { INewsRundown } from './datastructures/Rundown'
import { RundownManager } from './RundownManager'
import * as _ from 'underscore'
import { RundownSegment, ISegment } from './datastructures/Segment'
import * as Winston from 'winston'
import { INewsQueue, InewsFTPHandler } from '../inewsHandler'
import { INewsClient } from 'inews'
import { CoreHandler } from '../coreHandler'
import { PeripheralDeviceAPI as P } from '@sofie-automation/server-core-integration'
import { ParsedINewsIntoSegments, SegmentRankings, SegmentRankingsInner } from './ParsedINewsToSegments'
import { literal } from '../helpers'
import { IngestPlaylist, IngestRundown, IngestSegment } from '@sofie-automation/blueprints-integration'
import { INGEST_RUNDOWN_TYPE, MutatedSegment } from '../mutate'
import { ResolvedPlaylist, ResolveRundownIntoPlaylist } from '../helpers/ResolveRundownIntoPlaylist'
import {
	DiffPlaylist,
	PlaylistChangeRundownCreated,
	PlaylistChangeRundownDeleted,
	PlaylistChangeSegmentCreated,
	PlaylistChangeSegmentDeleted,
	PlaylistChangeSegmentMoved,
	PlaylistChangeType,
} from '../helpers/DiffPlaylist'
import { PlaylistId, RundownId, SegmentId } from '../helpers/id'
import { Mutex } from 'async-mutex'

dotenv.config()

export enum RundownChangeType {
	RUNDOWN_CREATE,
	RUNDOWN_UPDATE,
	RUNDOWN_DELETE,
	SEGMENT_UPDATE,
	SEGMENT_DELETE,
	SEGMENT_CREATE,
	SEGMENT_RANK_UPDATE,
}

export interface RundownChangeBase {
	type: RundownChangeType
	rundownExternalId: string
}

export interface RundownChangeRundownCreate extends RundownChangeBase {
	type: RundownChangeType.RUNDOWN_CREATE
}

export interface RundownChangeRundownDelete extends RundownChangeBase {
	type: RundownChangeType.RUNDOWN_DELETE
}

export interface RundownChangeRundownUpdate extends RundownChangeBase {
	type: RundownChangeType.RUNDOWN_UPDATE
}

export interface RundownChangeSegmentBase extends RundownChangeBase {
	segmentExternalId: string
}

export interface RundownChangeSegmentUpdate extends RundownChangeSegmentBase {
	type: RundownChangeType.SEGMENT_UPDATE
}

export interface RundownChangeSegmentDelete extends RundownChangeSegmentBase {
	type: RundownChangeType.SEGMENT_DELETE
}

export interface RundownChangeSegmentCreate extends RundownChangeSegmentBase {
	type: RundownChangeType.SEGMENT_CREATE
	/** For cases e.g. reload iNews data where cache should be ignored */
	skipCache?: true
}

export interface RundownChangeSegmentRankUpdate extends RundownChangeSegmentBase {
	type: RundownChangeType.SEGMENT_RANK_UPDATE
	rank: number
}

export type RundownChange = RundownChangeRundown | RundownChangeSegment

export type RundownChangeRundown = RundownChangeRundownCreate | RundownChangeRundownDelete | RundownChangeRundownUpdate

export type RundownChangeSegment =
	| RundownChangeSegmentCreate
	| RundownChangeSegmentDelete
	| RundownChangeSegmentUpdate
	| RundownChangeSegmentRankUpdate

export interface RundownChangeMap {
	rundown: {
		change?: RundownChangeRundownDelete | RundownChangeRundownCreate | RundownChangeRundownUpdate
	}
	segments: RundownChangeSegment[]
}

export function IsRundownChangeRundownCreate(change: RundownChange): change is RundownChangeRundownCreate {
	return change.type === RundownChangeType.RUNDOWN_CREATE
}

export function IsRundownChangeRundownDelete(change: RundownChange): change is RundownChangeRundownDelete {
	return change.type === RundownChangeType.RUNDOWN_DELETE
}

export function IsRundownChangeRundownUpdate(change: RundownChange): change is RundownChangeRundownUpdate {
	return change.type === RundownChangeType.RUNDOWN_UPDATE
}

export function IsRundownChangeSegmentCreate(change: RundownChange): change is RundownChangeSegmentCreate {
	return change.type === RundownChangeType.SEGMENT_CREATE
}

export function IsRundownChangeSegmentDelete(change: RundownChange): change is RundownChangeSegmentDelete {
	return change.type === RundownChangeType.SEGMENT_DELETE
}

export function IsRundownChangeSegmentUpdate(change: RundownChange): change is RundownChangeSegmentUpdate {
	return change.type === RundownChangeType.SEGMENT_UPDATE
}

export function IsRundownChangeSegmentRankUpdate(change: RundownChange): change is RundownChangeSegmentRankUpdate {
	return change.type === RundownChangeType.SEGMENT_RANK_UPDATE
}

export type ReducedPlaylist = Omit<IngestPlaylist, 'rundowns'> & { rundowns: ReducedRundown[] }
export type ReducedRundown = Pick<INewsRundown, 'externalId' | 'name' | 'gatewayVersion'> & {
	segments: ReducedSegment[]
}
export type ReducedSegment = Pick<ISegment, 'externalId' | 'modified' | 'rank' | 'name' | 'locator'>
export type UnrankedSegment = Omit<ISegment, 'rank' | 'float'>

export type PlaylistMap = Map<PlaylistId, ReducedPlaylist>
export type RundownMap = Map<RundownId, ReducedRundown>

const RECALCULATE_RANKS_CHANGE_THRESHOLD = 50
const MAX_TIME_BEFORE_RECALCULATE_RANKS = 60 * 60 * 1000 // One hour
const MINIMUM_ALLOWED_RANK = Math.pow(1 / 2, 30)

export function IsReducedSegment(segment: any): segment is ReducedSegment {
	return Object.keys(segment).includes('locator') && !Object.keys(segment).includes('iNewsStory')
}

export class RundownWatcher extends EventEmitter {
	on!: ((event: 'info', listener: (message: string) => void) => this) &
		((event: 'error', listener: (error: any, stack?: any) => void) => this) &
		((event: 'warning', listener: (message: string) => void) => this) &
		((event: 'playlist_delete', listener: (playlistId: string) => void) => this) &
		((event: 'playlist_create', listener: (playlistId: string, playlist: IngestPlaylist) => void) => this) &
		((event: 'playlist_update', listener: (playlistId: string, playlist: IngestPlaylist) => void) => this) &
		((event: 'rundown_delete', listener: (rundownId: string) => void) => this) &
		((event: 'rundown_create', listener: (rundownId: string, rundown: IngestRundown) => void) => this) &
		((event: 'rundown_update', listener: (rundownId: string, rundown: IngestRundown) => void) => this) &
		((event: 'segment_delete', listener: (rundownId: string, segmentId: string) => void) => this) &
		((
			event: 'segment_create',
			listener: (rundownId: string, segmentId: string, newSegment: IngestSegment) => void
		) => this) &
		((
			event: 'segment_update',
			listener: (rundownId: string, segmentId: string, newSegment: IngestSegment) => void
		) => this) &
		((
			event: 'segment_ranks_update',
			listener: (rundownId: string, newRanks: { [segmentExternalId: string]: number }) => void
		) => this)

	emit!: ((event: 'info', message: string) => boolean) &
		((event: 'error', message: string) => boolean) &
		((event: 'warning', message: string) => boolean) &
		((event: 'playlist_delete', playlistId: string) => boolean) &
		((event: 'playlist_create', playlistId: string, playlist: IngestPlaylist) => boolean) &
		((event: 'playlist_update', playlistId: string, playlist: IngestPlaylist) => boolean) &
		((event: 'rundown_delete', rundownId: string) => boolean) &
		((event: 'rundown_create', rundownId: string, rundown: IngestRundown) => boolean) &
		((event: 'rundown_update', rundownId: string, rundown: IngestRundown) => boolean) &
		((event: 'segment_delete', rundownId: string, segmentId: string) => boolean) &
		((event: 'segment_create', rundownId: string, segmentId: string, newSegment: IngestSegment) => boolean) &
		((event: 'segment_update', rundownId: string, segmentId: string, newSegment: IngestSegment) => boolean) &
		((event: 'segment_ranks_update', rundownId: string, newRanks: { [segmentExternalId: string]: number }) => boolean)

	public pollInterval: number = 2000
	private pollTimer: NodeJS.Timeout | undefined

	public rundownManager: RundownManager
	private _logger: Winston.LoggerInstance
	private previousRanks: SegmentRankings = new Map()
	private lastForcedRankRecalculation: Map<PlaylistId, number> = new Map()

	private cachedINewsData: Map<SegmentId, UnrankedSegment> = new Map()
	private cachedPlaylistAssignments: Map<PlaylistId, ResolvedPlaylist> = new Map()

	public playlists: RundownMap = new Map()

	private processingRundown: Mutex = new Mutex()

	/**
	 * A Rundown watcher which will poll iNews FTP server for changes and emit events
	 * whenever a change occurs.
	 *
	 * @param coreHandler Handler for Sofie Core
	 * @param gatewayVersion Set version of gateway
	 * @param delayStart (Optional) Set to a falsy value to prevent the watcher to start watching immediately.
	 */
	constructor(
		private logger: Winston.LoggerInstance,
		private iNewsConnection: INewsClient,
		private coreHandler: CoreHandler,
		private iNewsQueue: Array<INewsQueue>,
		private gatewayVersion: string,
		private handler: InewsFTPHandler,
		delayStart?: boolean
	) {
		super()
		this._logger = this.logger

		this.rundownManager = new RundownManager(this._logger, this.iNewsConnection)

		if (!delayStart) {
			this.startWatcher()
		}
	}

	/**
	 * Start the watcher
	 */
	startWatcher() {
		this.logger.info('Clear all watchers')
		this.stopWatcher()
		this.logger.info('Start watchers')

		// Subsequent runs
		this.startPollTimer()
	}

	private watch() {
		this.stopPollTimer()
		this.logger.info('Check rundowns for updates')

		this.checkINewsRundowns()
			.then(
				async () => {
					if (this.iNewsConnection.queueLength() > 0) {
						this.logger.error(
							`INews library queue length was ${this.iNewsConnection.queueLength()} when it should be 0.`
						)
					}

					if (this.handler.isConnected) {
						await this.coreHandler.setStatus(P.StatusCode.GOOD, [])
					}
				},
				async (error) => {
					this.logger.error('Something went wrong during check', error, error.stack)
					await this.coreHandler.setStatus(P.StatusCode.WARNING_MAJOR, ['Check INews rundows failed'])
				}
			)
			.catch(this._logger.error)
			.finally(() => this.startPollTimer())
	}

	/**
	 * Stop the watcher
	 */
	stopWatcher() {
		this.stopPollTimer()
	}

	private startPollTimer() {
		this.stopPollTimer()
		this.pollTimer = setTimeout(() => this.watch(), this.pollInterval)
	}

	private stopPollTimer() {
		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			this.pollTimer = undefined
		}
	}

	dispose() {
		this.stopWatcher()
	}

	public async ResyncRundown(rundownExternalId: string) {
		const release = await this.processingRundown.acquire()
		const playlistExternalId = rundownExternalId.replace(/_\d+$/, '')
		const playlist = this.playlists.get(playlistExternalId)

		if (!playlist) {
			return
		}

		for (let key of this.previousRanks.keys()) {
			if (key.includes(playlistExternalId)) {
				this.previousRanks.delete(key)
			}
		}

		this.playlists.delete(playlistExternalId)
		this.cachedPlaylistAssignments.delete(playlistExternalId)
		this.lastForcedRankRecalculation.delete(playlistExternalId)

		playlist.segments.forEach((segment) => {
			this.cachedINewsData.delete(segment.externalId)
		})
		release()
	}

	async checkINewsRundowns(): Promise<void> {
		for (let queue of this.iNewsQueue) {
			await this.checkINewsRundownById(queue.queues)
		}
	}

	async checkINewsRundownById(rundownId: string): Promise<ReducedRundown> {
		const rundown = await this.rundownManager.downloadRundown(rundownId)
		if (rundown.gatewayVersion === this.gatewayVersion) {
			const release = await this.processingRundown.acquire()
			try {
				await this.processUpdatedRundown(rundown.externalId, rundown)
			} catch (e) {
				this.logger.error(e)
			}
			release()
		}
		return rundown
	}

	static numberOfDecimals(val: number) {
		if (Math.floor(val) === val) return 0
		return val.toString().split('.')[1].length || 0
	}

	private async processUpdatedRundown(playlistId: string, playlist: ReducedRundown) {
		const uncachedINewsData: Set<SegmentId> = new Set()
		playlist.segments.forEach((s) => {
			if (!this.cachedINewsData.has(s.externalId)) {
				uncachedINewsData.add(s.externalId)
			}
		})

		let cachedPlaylist = this.playlists.get(playlistId)
		let changedSegments: Set<SegmentId> = new Set()

		// Fetch any segments that may have changed
		if (cachedPlaylist) {
			for (const segment of cachedPlaylist.segments) {
				if (uncachedINewsData.has(segment.externalId)) {
					continue
				}

				const cachedSegment = cachedPlaylist.segments.find((s) => s.externalId === segment.externalId)

				if (!cachedSegment) {
					continue
				}

				if (cachedSegment.locator !== segment.locator) {
					uncachedINewsData.add(segment.externalId)
					changedSegments.add(segment.externalId)
				}
			}
		}

		const iNewsDataPs: Promise<Map<SegmentId, UnrankedSegment>> = this.rundownManager.fetchINewsStoriesById(
			playlistId,
			Array.from(uncachedINewsData)
		)

		const iNewsData = await iNewsDataPs

		for (let [externalId, data] of iNewsData.entries()) {
			this.cachedINewsData.set(externalId, data)
		}

		const segmentsToResolve: Array<UnrankedSegment> = []

		playlist.segments.forEach((s) => {
			const cachedData = this.cachedINewsData.get(s.externalId)

			if (!cachedData) {
				// Shouldn't be possible.
				this.logger.error(
					`Could not find iNews data for segment ${s.externalId} in rundown ${playlistId}. Segment will appear out of order.`
				)
			} else {
				segmentsToResolve.push(cachedData)
			}
		})

		const playlistAssignments = ResolveRundownIntoPlaylist(playlistId, segmentsToResolve)
		const { changes, segmentChanges } = DiffPlaylist(
			playlistAssignments,
			this.cachedPlaylistAssignments.get(playlistId) ?? []
		)

		this.cachedPlaylistAssignments.set(playlistId, playlistAssignments)
		let assignedRanks: Map<SegmentId, number> = new Map()

		for (let rundown of playlistAssignments) {
			const changesToSegments = segmentChanges.get(rundown.rundownId)

			if (!changesToSegments) {
				// Shouldn't be possible.
				this.logger.error(`Could not find segment changes for rundown ${rundown.rundownId}.`)
				continue
			}

			let { segmentRanks, recalculatedAsIntegers } = ParsedINewsIntoSegments.GetRanks(
				rundown.rundownId,
				rundown.segments,
				this.previousRanks,
				changesToSegments.movedSegments,
				changesToSegments.notMovedSegments,
				changesToSegments.insertedSegments,
				changesToSegments.deletedSegments,
				this._logger
			)

			// Check if we should recalculate ranks to integer values from scratch.
			let prevRank: number | undefined = undefined
			let minRank = Number.POSITIVE_INFINITY
			if (!recalculatedAsIntegers) {
				for (const [_, rank] of segmentRanks) {
					if (prevRank !== undefined) {
						const diffRank = rank - prevRank
						minRank = Math.min(minRank, diffRank)
					}
					prevRank = rank
				}
			}

			let lastRankRecalculation = this.lastForcedRankRecalculation.get(playlistId) ?? 0
			if (
				!recalculatedAsIntegers &&
				(minRank < MINIMUM_ALLOWED_RANK ||
					changes.length >= RECALCULATE_RANKS_CHANGE_THRESHOLD ||
					Date.now() - lastRankRecalculation >= MAX_TIME_BEFORE_RECALCULATE_RANKS ||
					Array.from(segmentRanks.values()).some((segment) => RundownWatcher.numberOfDecimals(segment) > 3))
			) {
				segmentRanks = ParsedINewsIntoSegments.RecalculateRanksAsIntegerValues(rundown.segments).segmentRanks

				const previousRanks = this.previousRanks.get(rundown.rundownId)

				if (previousRanks) {
					for (let [segmentId, rank] of segmentRanks) {
						const previousRank = previousRanks.get(segmentId)

						if (!previousRank) {
							continue
						}

						const alreadyUpdating = changes.some(
							(change) =>
								change.type ===
									(PlaylistChangeType.PlaylistChangeSegmentCreated || PlaylistChangeType.PlaylistChangeSegmentMoved) &&
								change.segmentExternalId === segmentId
						)

						if (!alreadyUpdating && previousRank.rank !== rank) {
							changedSegments.add(segmentId)
							changes.push(
								literal<PlaylistChangeSegmentMoved>({
									type: PlaylistChangeType.PlaylistChangeSegmentMoved,
									rundownExternalId: rundown.rundownId,
									segmentExternalId: segmentId,
								})
							)
						}
					}
				}

				this.lastForcedRankRecalculation.set(playlistId, Date.now())
			}

			// Store ranks
			for (let [segmentId, rank] of segmentRanks) {
				assignedRanks.set(segmentId, rank)
			}

			this.updatePreviousRanks(rundown.rundownId, assignedRanks)
		}

		this.playlists.set(playlistId, playlist)

		if (!cachedPlaylist) {
			const ingestPlaylist = literal<IngestPlaylist>({
				externalId: playlistId,
				name: playlistId,
				rundowns: playlistAssignments.map((rundown) =>
					this.playlistRundownToIngestRundown(
						playlistId,
						rundown.rundownId,
						rundown.segments,
						this.cachedINewsData,
						assignedRanks
					)
				),
				loop: false,
			})
			if (!ingestPlaylist.rundowns.length) {
				ingestPlaylist.rundowns.push(
					literal<IngestRundown>({
						externalId: `${playlistId}_1`,
						name: playlistId,
						type: INGEST_RUNDOWN_TYPE,
						segments: [],
					})
				)
			}
			this.playlists.set(playlistId, playlist)
			this.logger.info(`EMITTING PLAYLIST CREATE`)
			this.emitPlaylistCreated(ingestPlaylist)
			return
		}

		const playlistDeletedRundowns: PlaylistChangeRundownDeleted[] = changes.filter(
			(f) => f.type === PlaylistChangeType.PlaylistChangeRundownDeleted
		) as PlaylistChangeRundownDeleted[]
		let playlistCreatedRundowns: PlaylistChangeRundownCreated[] = changes.filter(
			(f) => f.type === PlaylistChangeType.PlaylistChangeRundownCreated
		) as PlaylistChangeRundownCreated[]
		let playlistChangedSegments: Array<PlaylistChangeSegmentMoved | PlaylistChangeSegmentCreated> = changes.filter(
			(f) =>
				f.type === PlaylistChangeType.PlaylistChangeSegmentCreated ||
				f.type === PlaylistChangeType.PlaylistChangeSegmentMoved
		) as Array<PlaylistChangeSegmentMoved | PlaylistChangeSegmentCreated>
		let playlistDeletedSegment: PlaylistChangeSegmentDeleted[] = changes.filter(
			(f) => f.type === PlaylistChangeType.PlaylistChangeSegmentDeleted
		) as PlaylistChangeSegmentDeleted[]

		for (let rundown of playlistDeletedRundowns) {
			this.emitRundownDeleted(rundown.rundownExternalId)

			playlistChangedSegments = playlistChangedSegments.filter((s) => s.rundownExternalId !== rundown.rundownExternalId)
			playlistDeletedSegment = playlistDeletedSegment.filter((s) => s.rundownExternalId !== rundown.rundownExternalId)
		}

		for (let segment of playlistDeletedSegment) {
			this.emitSegmentDeleted(segment.rundownExternalId, segment.segmentExternalId)
		}

		// Second round of fetching iNews data for anything that may have changed but has not been fetched from iNews.
		let uncachedINewsData2: Set<SegmentId> = new Set()
		let changedSegmentsByRundownId: Map<
			RundownId,
			Array<PlaylistChangeSegmentCreated | PlaylistChangeSegmentMoved>
		> = new Map()
		for (let change of playlistChangedSegments) {
			if (!uncachedINewsData.has(change.segmentExternalId)) {
				uncachedINewsData2.add(change.segmentExternalId)
			}

			changedSegments.add(change.segmentExternalId)

			const rundown = changedSegmentsByRundownId.get(change.rundownExternalId)

			if (!rundown) {
				changedSegmentsByRundownId.set(change.rundownExternalId, [change])
			} else {
				rundown.push(change)
				changedSegmentsByRundownId.set(change.rundownExternalId, rundown)
			}
		}

		const iNewsDataPs2: Promise<Map<SegmentId, UnrankedSegment>> = this.rundownManager.fetchINewsStoriesById(
			playlistId,
			Array.from(uncachedINewsData2)
		)

		const ingestDataPromises: Array<Promise<Map<SegmentId, RundownSegment>>> = []

		for (let [rundownId, segmentList] of changedSegmentsByRundownId) {
			ingestDataPromises.push(
				this.coreHandler.GetSegmentsCacheById(
					rundownId,
					segmentList.map((s) => s.segmentExternalId)
				)
			)
		}

		const iNewsData2 = await iNewsDataPs2

		for (let [segmentId, data] of iNewsData2) {
			this.cachedINewsData.set(segmentId, data)
		}

		const ingestCacheList = await Promise.all(ingestDataPromises)

		const ingestCacheData: Map<SegmentId, RundownSegment> = new Map()

		for (let cache of ingestCacheList) {
			for (let [segmentId, data] of cache) {
				ingestCacheData.set(segmentId, data)
			}
		}

		for (let createdRundown of playlistCreatedRundowns) {
			const assignedRundown = playlistAssignments.find((r) => r.rundownId === createdRundown.rundownExternalId)

			if (!assignedRundown) {
				this.logger.error(
					`Tried to create rundown ${createdRundown} but could not find the segments associated with this rundown.`
				)
				continue
			}

			const rundown = this.playlistRundownToIngestRundown(
				playlistId,
				assignedRundown.rundownId,
				assignedRundown.segments,
				this.cachedINewsData,
				assignedRanks
			)
			this.emitRundownCreated(rundown)

			playlistChangedSegments = playlistChangedSegments.filter(
				(s) => s.rundownExternalId !== createdRundown.rundownExternalId
			)
		}

		const updatedRanks: Map<RundownId, { [segmentId: string]: number }> = new Map()

		for (let changedSegment of playlistChangedSegments) {
			const segmentId = changedSegment.segmentExternalId
			const rundownId = changedSegment.rundownExternalId
			const inews = this.cachedINewsData.get(changedSegment.segmentExternalId)
			let rank = assignedRanks.get(segmentId)
			const cachedData = ingestCacheData.get(segmentId)

			if (!inews) {
				this.logger.error(`Could not process segment change ${segmentId}, iNews data could not be found`)
				continue
			}

			if (rank === undefined) {
				this.logger.error(`Could not assign rank to ${segmentId}, it will appear out of order`)
				// Try to keep old position, otherwise send to top
				rank = cachedData?.rank ?? 0
			}

			const segment = this.inewsToIngestSegment(rundownId, segmentId, inews, rank)

			if (!cachedData) {
				this.emitSegmentCreated(rundownId, segment)
				continue
			}

			const rundownSegment = new RundownSegment(
				rundownId,
				inews.iNewsStory,
				inews.modified,
				inews.locator,
				segmentId,
				rank,
				inews.name
			)

			// TODO: `rundownSegment` could be replaced with `segment` if cachedData is not transformed when returned from core.
			if (!_.isEqual(_.omit(rundownSegment.serialize(), 'rank'), _.omit(cachedData.serialize(), 'rank'))) {
				this.emitSegmentUpdated(rundownId, segment)
			} else if (rundownSegment.rank !== cachedData.rank) {
				const updatedRundownRanks = updatedRanks.get(rundownId) ?? {}
				updatedRundownRanks[segmentId] = rundownSegment.rank
				updatedRanks.set(rundownId, updatedRundownRanks)
			}
		}

		for (let [rundownId, ranks] of updatedRanks) {
			this.emitUpdatedSegmentRanks(rundownId, ranks)
		}
	}

	private playlistRundownToIngestRundown(
		playlistId: PlaylistId,
		rundownId: RundownId,
		segments: string[],
		inewsCache: Map<SegmentId, UnrankedSegment>,
		ranks: Map<SegmentId, number>
	): IngestRundown {
		let ingestSegments: IngestSegment[] = []

		for (let segmentId of segments) {
			const inews = inewsCache.get(segmentId)
			const rank = ranks.get(segmentId)

			if (inews === undefined || rank === undefined) {
				this.logger.error(`Dropping segment ${segmentId} from rundown ${rundownId}`)
				continue
			}

			ingestSegments.push(this.inewsToIngestSegment(rundownId, segmentId, inews, rank))
		}

		return literal<IngestRundown>({
			externalId: rundownId,
			name: playlistId,
			type: INGEST_RUNDOWN_TYPE,
			segments: ingestSegments,
		})
	}

	private inewsToIngestSegment(
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

	private updatePreviousRanks(rundownId: RundownId, segments: Map<SegmentId, number>) {
		const ranksMap: Map<SegmentId, SegmentRankingsInner> = new Map()
		for (let [segmentId, rank] of segments) {
			ranksMap.set(segmentId, {
				rank,
			})
		}
		this.previousRanks.set(rundownId, ranksMap)
	}

	private emitPlaylistCreated(playlist: IngestPlaylist) {
		this.emit('playlist_create', playlist.externalId, playlist)
	}

	private emitRundownDeleted(rundownExternalId: string) {
		this.emit('rundown_delete', rundownExternalId)
	}

	private emitRundownCreated(rundown: IngestRundown) {
		this.emit('rundown_create', rundown.externalId, rundown)
	}

	private emitSegmentCreated(rundownId: RundownId, segment: IngestSegment) {
		this.emit('segment_create', rundownId, segment.externalId, segment)
	}

	private emitSegmentUpdated(rundownId: RundownId, segment: IngestSegment) {
		this.emit('segment_update', rundownId, segment.externalId, segment)
	}

	private emitSegmentDeleted(rundownId: RundownId, segmentId: SegmentId) {
		this.emit('segment_delete', rundownId, segmentId)
	}

	private emitUpdatedSegmentRanks(rundownId: RundownId, ranks: { [segmentId: string]: number }) {
		this.emit('segment_ranks_update', rundownId, ranks)
	}
}
