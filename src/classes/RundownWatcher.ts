import { EventEmitter } from 'events'
import * as dotenv from 'dotenv'
import { INewsRundown } from './datastructures/Rundown'
import { RundownManager } from './RundownManager'
import { RundownSegment, ISegment } from './datastructures/Segment'
import { INewsQueue, InewsFTPHandler } from '../inewsHandler'
import { INewsClient } from 'inews'
import { CoreHandler } from '../coreHandler'
import { PeripheralDeviceAPI as P } from '@sofie-automation/server-core-integration'
import { SegmentRankings, SegmentRankingsInner } from './ParsedINewsToSegments'
import { IngestPlaylist, IngestRundown, IngestSegment } from '@sofie-automation/blueprints-integration'
import { ResolvedPlaylist, ResolveRundownIntoPlaylist } from '../helpers/ResolveRundownIntoPlaylist'
import { DiffPlaylist } from '../helpers/DiffPlaylist'
import { PlaylistId, RundownId, SegmentId } from '../helpers/id'
import { Mutex } from 'async-mutex'
import { AssignRanksToSegments } from '../helpers/AssignRanksToSegments'
import { CoreCallType, GenerateCoreCalls } from '../helpers/GenerateCoreCalls'
import { assertUnreachable } from '../helpers'
import { ILogger as Logger } from '@tv2media/logger'

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
export type UnrankedSegment = Omit<ISegment, 'rank' | 'float' | 'untimed'>

export type PlaylistMap = Map<PlaylistId, { externalId: string; rundowns: RundownId[] }>
export type RundownMap = Map<RundownId, ReducedRundown>

export type PlaylistCache = Map<PlaylistId, RundownId[]>
export type RundownCache = Map<RundownId, SegmentId[]>
export type SegmentCache = Map<SegmentId, ReducedSegment>

export function IsReducedSegment(segment: any): segment is ReducedSegment {
	return Object.keys(segment).includes('locator') && !Object.keys(segment).includes('iNewsStory')
}

export class RundownWatcher extends EventEmitter {
	on!: ((event: 'info', listener: (message: string) => void) => this) &
		((event: 'error', listener: (error: any, stack?: any) => void) => this) &
		((event: 'warning', listener: (message: string) => void) => this) &
		((event: 'rundown_delete', listener: (rundownId: string) => void) => this) &
		((event: 'rundown_create', listener: (rundownId: string, rundown: IngestRundown) => void) => this) &
		((event: 'rundown_update', listener: (rundownId: string, rundown: IngestRundown) => void) => this) &
		((event: 'rundown_metadata_update', listener: (rundownId: string, rundown: IngestRundown) => void) => this) &
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
		((event: 'rundown_delete', rundownId: string) => boolean) &
		((event: 'rundown_create', rundownId: string, rundown: IngestRundown) => boolean) &
		((event: 'rundown_update', rundownId: string, rundown: IngestRundown) => boolean) &
		((event: 'rundown_metadata_update', rundownId: string, rundown: IngestRundown) => boolean) &
		((event: 'segment_delete', rundownId: string, segmentId: string) => boolean) &
		((event: 'segment_create', rundownId: string, segmentId: string, newSegment: IngestSegment) => boolean) &
		((event: 'segment_update', rundownId: string, segmentId: string, newSegment: IngestSegment) => boolean) &
		((event: 'segment_ranks_update', rundownId: string, newRanks: { [segmentExternalId: string]: number }) => boolean)

	public pollInterval: number = 2000
	private pollTimer: NodeJS.Timeout | undefined

	public rundownManager: RundownManager
	private _logger: Logger
	private previousRanks: SegmentRankings = new Map()
	private lastForcedRankRecalculation: Map<RundownId, number> = new Map()

	private cachedINewsData: Map<SegmentId, UnrankedSegment> = new Map()
	private cachedPlaylistAssignments: Map<PlaylistId, ResolvedPlaylist> = new Map()
	private cachedAssignedRundowns: Map<PlaylistId, Array<INewsRundown>> = new Map()
	private skipCacheForRundown: Set<RundownId> = new Set()

	public playlists: PlaylistCache = new Map()
	public rundowns: RundownCache = new Map()
	public segments: SegmentCache = new Map()

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
		private logger: Logger,
		private iNewsConnection: INewsClient,
		private coreHandler: CoreHandler,
		private iNewsQueue: Array<INewsQueue>,
		private gatewayVersion: string,
		private handler: InewsFTPHandler,
		delayStart?: boolean
	) {
		super()
		this._logger = this.logger.tag('RundownWatcher')

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

					this.rundownManager.emptyInewsFtpBuffer()
				},
				async (error) => {
					this.logger.data(error).error('Something went wrong during check:')
					await this.coreHandler.setStatus(P.StatusCode.WARNING_MAJOR, ['INews rundowns check failed'])
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
		const rundown = this.rundowns.get(rundownExternalId)

		if (!playlist || !rundown) {
			this.logger.error(`Rundown ${rundownExternalId} does not exist in playlist ${playlistExternalId}`)
			release()
			return
		}

		// Delete cached data for this rundown
		for (const segmentId of rundown) {
			this.segments.delete(segmentId)
			this.cachedINewsData.delete(segmentId)
		}
		this.rundowns.delete(rundownExternalId)
		this.playlists.set(
			playlistExternalId,
			playlist.filter((r) => r !== rundownExternalId)
		)

		const cachedPlaylist = this.cachedPlaylistAssignments.get(playlistExternalId)
		if (cachedPlaylist) {
			this.cachedPlaylistAssignments.set(
				playlistExternalId,
				cachedPlaylist.filter((p) => p.rundownId !== rundownExternalId)
			)
		}
		const cachedAssignedRundown = this.cachedAssignedRundowns.get(playlistExternalId)
		if (cachedAssignedRundown) {
			this.cachedAssignedRundowns.set(
				playlistExternalId,
				cachedAssignedRundown.filter((p) => p.externalId !== rundownExternalId)
			)
		}
		this.lastForcedRankRecalculation.delete(rundownExternalId)
		this.skipCacheForRundown.add(rundownExternalId)
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
				this.logger.error(e as any)
			}
			release()
		}
		return rundown
	}

	private async processUpdatedRundown(playlistId: string, playlist: ReducedRundown) {
		const uncachedINewsData: Set<SegmentId> = new Set()
		playlist.segments.forEach((s) => {
			if (!this.cachedINewsData.has(s.externalId)) {
				uncachedINewsData.add(s.externalId)
			}
		})

		const cachedPlaylist = this.playlists.get(playlistId)

		if (cachedPlaylist) {
			const cachedRundowns: Array<{ externalId: RundownId; segmentIds: SegmentId[] }> = []
			for (const rundownId of cachedPlaylist) {
				let cachedRundown = this.rundowns.get(rundownId)
				if (!cachedRundown) continue
				cachedRundowns.push({ externalId: rundownId, segmentIds: cachedRundown })
			}

			// Fetch any segments that may have changed
			for (const segment of playlist.segments) {
				const cachedSegment = this.segments.get(segment.externalId)

				if (!cachedSegment) {
					uncachedINewsData.add(segment.externalId)
					continue
				}

				if (cachedSegment.locator !== segment.locator) {
					uncachedINewsData.add(segment.externalId)
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

		const { resolvedPlaylist: playlistAssignments, untimedSegments } = ResolveRundownIntoPlaylist(
			playlistId,
			segmentsToResolve
		)
		if (!playlistAssignments.length) {
			playlistAssignments.push({
				rundownId: `${playlistId}_1`,
				segments: [],
			})
		}

		// Fetch ingestDataCache for segments that have been modified
		const ingestDataPromises: Array<Promise<Map<SegmentId, RundownSegment>>> = []

		for (const rundown of playlistAssignments) {
			if (this.skipCacheForRundown.has(rundown.rundownId)) {
				this.skipCacheForRundown.delete(rundown.rundownId)
				continue
			}

			const segmentsToFetch: SegmentId[] = []
			for (const segmentId of rundown.segments) {
				if (uncachedINewsData.has(segmentId)) {
					segmentsToFetch.push(segmentId)
				}
			}

			ingestDataPromises.push(this.coreHandler.GetSegmentsCacheById(rundown.rundownId, segmentsToFetch))
		}

		const ingestCacheList = await Promise.all(ingestDataPromises)

		const ingestCacheData: Map<SegmentId, RundownSegment> = new Map()

		for (let cache of ingestCacheList) {
			for (let [segmentId, data] of cache) {
				ingestCacheData.set(segmentId, data)
			}
		}

		const assignedRundowns: INewsRundown[] = []

		for (const playlistRundown of playlistAssignments) {
			const rundownSegments: RundownSegment[] = []

			for (const segmentId of playlistRundown.segments) {
				const iNewsData = this.cachedINewsData.get(segmentId)

				if (!iNewsData) {
					this.logger.error(
						`Failed to assign segment ${segmentId} to rundown ${playlistRundown.rundownId}. Could not find cached iNews data`
					)
					continue
				}

				const rundownSegment = new RundownSegment(
					playlistRundown.rundownId,
					iNewsData.iNewsStory,
					iNewsData.modified,
					iNewsData.locator,
					segmentId,
					0,
					iNewsData?.name,
					untimedSegments.has(segmentId)
				)
				rundownSegments.push(rundownSegment)
			}

			const iNewsRundown: INewsRundown = new INewsRundown(
				playlistRundown.rundownId,
				playlistRundown.rundownId,
				this.gatewayVersion,
				rundownSegments,
				playlistRundown.payload
			)

			assignedRundowns.push(iNewsRundown)
		}

		const { changes, segmentChanges } = DiffPlaylist(
			assignedRundowns,
			this.cachedAssignedRundowns.get(playlistId) ?? []
		)

		this.cachedPlaylistAssignments.set(playlistId, playlistAssignments)
		this.cachedAssignedRundowns.set(playlistId, assignedRundowns)

		let segmentRanks = AssignRanksToSegments(
			playlistAssignments,
			changes,
			segmentChanges,
			this.previousRanks,
			this.lastForcedRankRecalculation
		)
		const assignedRanks: Map<SegmentId, number> = new Map()
		for (const rundown of segmentRanks) {
			if (rundown.recalculatedAsIntegers) {
				this.lastForcedRankRecalculation.set(rundown.rundownId, Date.now())
			}

			for (const [segmentId, rank] of rundown.assignedRanks) {
				assignedRanks.set(segmentId, rank)
			}
			this.updatePreviousRanks(rundown.rundownId, rundown.assignedRanks)
		}

		for (const segment of playlist.segments) {
			this.segments.set(segment.externalId, segment)
		}
		for (const rundown of playlistAssignments) {
			this.rundowns.set(rundown.rundownId, rundown.segments)
		}
		this.playlists.set(
			playlistId,
			playlistAssignments.map((r) => r.rundownId)
		)

		const coreCalls = GenerateCoreCalls(
			playlistId,
			changes,
			playlistAssignments,
			assignedRanks,
			this.cachedINewsData,
			ingestCacheData,
			untimedSegments
		)

		for (const call of coreCalls) {
			switch (call.type) {
				case CoreCallType.dataRundownCreate:
					this.emitRundownCreated(call.rundown)
					break
				case CoreCallType.dataRundownDelete:
					this.emitRundownDeleted(call.rundownExternalId)
					break
				case CoreCallType.dataRundownUpdate:
					this.emitRundownUpdated(call.rundown)
					break
				case CoreCallType.dataSegmentCreate:
					this.emitSegmentCreated(call.rundownExternalId, call.segment)
					break
				case CoreCallType.dataSegmentDelete:
					this.emitSegmentDeleted(call.rundownExternalId, call.segmentExternalId)
					break
				case CoreCallType.dataSegmentUpdate:
					this.emitSegmentUpdated(call.rundownExternalId, call.segment)
					break
				case CoreCallType.dataSegmentRanksUpdate:
					this.emitUpdatedSegmentRanks(call.rundownExternalId, call.ranks)
					break
				case CoreCallType.dataRundownMetaDataUpdate:
					this.emitRundownMetaDataUpdated(call.rundown)
					break
				default:
					assertUnreachable(call)
			}
		}
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

	private emitRundownDeleted(rundownExternalId: string) {
		this.logger.info(`Emitting rundown delete ${rundownExternalId}`)
		this.emit('rundown_delete', rundownExternalId)
	}

	private emitRundownCreated(rundown: IngestRundown) {
		this.logger.info(`Emitting rundown create ${rundown.externalId}`)
		this.emit('rundown_create', rundown.externalId, rundown)
	}

	private emitRundownUpdated(rundown: IngestRundown) {
		this.logger.info(`Emitting rundown update ${rundown.externalId}`)
		this.emit('rundown_update', rundown.externalId, rundown)
	}

	private emitRundownMetaDataUpdated(rundown: IngestRundown) {
		this.logger.info(`Emitting rundown metadata update ${rundown.externalId}`)
		this.emit('rundown_metadata_update', rundown.externalId, rundown)
	}

	private emitSegmentCreated(rundownId: RundownId, segment: IngestSegment) {
		this.logger.info(`Emitting segment create ${segment.externalId} in ${rundownId}`)
		this.emit('segment_create', rundownId, segment.externalId, segment)
	}

	private emitSegmentUpdated(rundownId: RundownId, segment: IngestSegment) {
		this.logger.info(`Emitting segment update ${segment.externalId} in ${rundownId}`)
		this.emit('segment_update', rundownId, segment.externalId, segment)
	}

	public emitSegmentDeleted(rundownId: RundownId, segmentId: SegmentId) {
		this.logger.info(`Emitting segment delete ${segmentId} in ${rundownId}`)
		this.emit('segment_delete', rundownId, segmentId)
	}

	private emitUpdatedSegmentRanks(rundownId: RundownId, ranks: { [segmentId: string]: number }) {
		this.logger.info(`Emitting segment ranks update ${rundownId}`)
		this.emit('segment_ranks_update', rundownId, ranks)
	}
}
