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
import { PeripheralDeviceAPI as P } from 'tv-automation-server-core-integration'
import { ParsedINewsIntoSegments, SegmentRankings, SegmentRankingsInner } from './ParsedINewsToSegments'

dotenv.config()

export enum RundownChangeType {
	RUNDOWN_CREATE,
	RUNDOWN_UPDATE,
	RUNDOWN_DELETE,
	SEGMENT_UPDATE,
	SEGMENT_DELETE,
	SEGMENT_CREATE,
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

export interface RundownChangeSegment extends RundownChangeBase {
	segmentExternalId: string
}

export interface RundownChangeSegmentUpdate extends RundownChangeSegment {
	type: RundownChangeType.SEGMENT_UPDATE
}

export interface RundownChangeSegmentDelete extends RundownChangeSegment {
	type: RundownChangeType.SEGMENT_DELETE
}

export interface RundownChangeSegmentCreate extends RundownChangeSegment {
	type: RundownChangeType.SEGMENT_CREATE
	/** For cases e.g. reload iNews data where cache should be ignored */
	skipCache?: true
}

export type RundownChange =
	| RundownChangeRundownCreate
	| RundownChangeRundownDelete
	| RundownChangeRundownUpdate
	| RundownChangeSegmentCreate
	| RundownChangeSegmentDelete
	| RundownChangeSegmentUpdate

export type ReducedRundown = Pick<INewsRundown, 'externalId' | 'name' | 'gatewayVersion'> & {
	segments: ReducedSegment[]
}
export type ReducedSegment = Pick<ISegment, 'externalId' | 'modified' | 'rank' | 'name' | 'locator'>
export type UnrankedSegment = Omit<ISegment, 'rank' | 'float'>

export type RundownMap = Map<string, ReducedRundown>

export class RundownWatcher extends EventEmitter {
	on!: ((event: 'info', listener: (message: string) => void) => this) &
		((event: 'error', listener: (error: any, stack?: any) => void) => this) &
		((event: 'warning', listener: (message: string) => void) => this) &
		((event: 'rundown_delete', listener: (rundownId: string) => void) => this) &
		((event: 'rundown_create', listener: (rundownId: string, rundown: ReducedRundown) => void) => this) &
		((event: 'rundown_update', listener: (rundownId: string, rundown: ReducedRundown) => void) => this) &
		((event: 'segment_delete', listener: (rundownId: string, segmentId: string) => void) => this) &
		((
			event: 'segment_create',
			listener: (rundownId: string, segmentId: string, newSegment: RundownSegment) => void
		) => this) &
		((
			event: 'segment_update',
			listener: (rundownId: string, segmentId: string, newSegment: RundownSegment) => void
		) => this)

	emit!: ((event: 'info', message: string) => boolean) &
		((event: 'error', message: string) => boolean) &
		((event: 'warning', message: string) => boolean) &
		((event: 'rundown_delete', rundownId: string) => boolean) &
		((event: 'rundown_create', rundownId: string, rundown: ReducedRundown) => boolean) &
		((event: 'rundown_update', rundownId: string, rundown: ReducedRundown) => boolean) &
		((event: 'segment_delete', rundownId: string, segmentId: string) => boolean) &
		((event: 'segment_create', rundownId: string, segmentId: string, newSegment: RundownSegment) => boolean) &
		((event: 'segment_update', rundownId: string, segmentId: string, newSegment: RundownSegment) => boolean)

	public pollInterval: number = 2000
	private pollTimer: NodeJS.Timeout | undefined

	public rundownManager: RundownManager
	private _logger: Winston.LoggerInstance
	private previousRanks: SegmentRankings = new Map()

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
		/** Map of rundown Ids to iNews Rundowns, may be undefined if rundown has not been previously downloaded. */
		public rundowns: RundownMap,
		private handler: InewsFTPHandler,
		delayStart?: boolean
	) {
		super()
		this._logger = this.logger

		for (let rundown of rundowns.entries()) {
			this.updatePreviousRanks(rundown[0], rundown[1].segments)
		}

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
						await this.coreHandler.setStatus(P.StatusCode.GOOD, [`Watching iNews Queues`])
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

	public ResyncRundown(rundownExternalId: string) {
		const rundown = this.rundowns.get(rundownExternalId)

		if (!rundown) {
			return
		}

		rundown.segments = []
		this.rundowns.set(rundownExternalId, rundown)
		this.previousRanks.delete(rundownExternalId)
	}

	async checkINewsRundowns(): Promise<void> {
		for (let queue of this.iNewsQueue) {
			await this.checkINewsRundownById(queue.queues)
		}
	}

	async checkINewsRundownById(rundownId: string): Promise<ReducedRundown> {
		const rundown = await this.rundownManager.downloadRundown(rundownId)
		if (rundown.gatewayVersion === this.gatewayVersion) {
			await this.processUpdatedRundown(rundown.externalId, rundown)
		}
		return rundown
	}

	private async processUpdatedRundown(rundownId: string, rundown: ReducedRundown) {
		const { segments, changes } = ParsedINewsIntoSegments.GetUpdatesAndRanks(
			rundownId,
			rundown,
			rundown.segments,
			this.previousRanks,
			this.rundowns.get(rundownId),
			this._logger
		)

		// Store ranks
		const ranksMap = this.updatePreviousRanks(rundownId, segments)
		rundown.segments = segments
		this.rundowns.set(rundownId, rundown)

		await this.processAndEmitRundownChanges(rundown, changes)
		await this.processAndEmitSegmentUpdates(rundownId, changes, ranksMap)
	}

	private updatePreviousRanks(rundownId: string, segments: ReducedSegment[]): Map<string, SegmentRankingsInner> {
		const ranksMap: Map<string, SegmentRankingsInner> = new Map()
		segments.forEach((segment) => {
			ranksMap.set(segment.externalId, {
				rank: segment.rank,
			})
		})
		this.previousRanks.set(rundownId, ranksMap)
		return ranksMap
	}

	private async processAndEmitRundownChanges(rundown: ReducedRundown, changes: RundownChange[]) {
		// Send DELETE messages first
		const deleted = changes.filter(
			(change) => change.type === RundownChangeType.RUNDOWN_DELETE || change.type === RundownChangeType.SEGMENT_DELETE
		)
		deleted.forEach((update) => {
			switch (update.type) {
				case RundownChangeType.RUNDOWN_DELETE:
					this.emit('rundown_delete', update.rundownExternalId)
					break
				case RundownChangeType.SEGMENT_DELETE:
					this.emit('segment_delete', update.rundownExternalId, update.segmentExternalId)
					break
			}
		})

		// Rundown updates can be sent immedaitely
		const rundownUpdated = changes.filter(
			(change) => change.type === RundownChangeType.RUNDOWN_UPDATE || change.type === RundownChangeType.RUNDOWN_CREATE
		)
		rundownUpdated.forEach((update) => {
			switch (update.type) {
				case RundownChangeType.RUNDOWN_CREATE:
					// This creates the rundown without segments, segments will come later.
					this.emit('rundown_create', update.rundownExternalId, rundown)
					break
				case RundownChangeType.RUNDOWN_UPDATE:
					this.emit('rundown_update', update.rundownExternalId, rundown)
					break
			}
		})
	}

	private async processAndEmitSegmentUpdates(
		rundownId: string,
		changes: RundownChange[],
		segmentRanks: Map<string, SegmentRankingsInner>
	) {
		const skipCache: Map<string, boolean> = new Map()

		const updatedSegments: string[] = (changes.filter(
			(change) => change.type === RundownChangeType.SEGMENT_UPDATE
		) as RundownChangeSegmentUpdate[]).map((s) => s.segmentExternalId)
		const createdSegments: string[] = (changes.filter(
			(change) => change.type === RundownChangeType.SEGMENT_CREATE
		) as RundownChangeSegmentCreate[]).map((s) => {
			if (s.skipCache) {
				skipCache.set(s.segmentExternalId, true)
			}
			return s.segmentExternalId
		})

		// Make no assumption about whether the update / create assessment is correct.
		// At this point we can only be sure that we need to check for a difference.
		const updatedOrCreated: string[] = [...updatedSegments, ...createdSegments]

		// No updates, don't make any calls to core / iNews
		if (!updatedOrCreated.length) {
			return
		}

		const ingestCacheDataPs: Promise<Map<string, RundownSegment>> = this.coreHandler.GetSegmentsCacheById(
			rundownId,
			updatedOrCreated.filter((segmentId) => !skipCache.get(segmentId))
		)
		const iNewsDataPs: Promise<Map<string, UnrankedSegment>> = this.rundownManager.fetchINewsStoriesById(
			rundownId,
			updatedOrCreated
		)

		const [ingestCacheData, iNewsData] = await Promise.all([ingestCacheDataPs, iNewsDataPs])

		updatedOrCreated.forEach((segmentId) => {
			const cache = !skipCache.get(segmentId) ? ingestCacheData.get(segmentId) : undefined
			const inews = iNewsData.get(segmentId)

			const newSegmentRankAssignement = segmentRanks.get(segmentId)?.rank || cache?.rank

			// If no rank is assigned, update is not safe
			if (newSegmentRankAssignement !== undefined) {
				this.diffSegment(rundownId, segmentId, inews, cache, newSegmentRankAssignement)
			} else {
				this.logger.error(`Segment ${segmentId} has not been assigned a rank`)
			}
		})
	}

	/**
	 * Compares the cached version of a segment to updates from iNews. Emits updates if changes have occured
	 * @param rundownId Rundown to send updates to
	 * @param segmentId Segment external Id
	 * @param iNewsData Data fetched from iNews
	 * @param cachedData Data fetched from ingestDataCache
	 */
	private diffSegment(
		rundownId: string,
		segmentId: string,
		iNewsData: UnrankedSegment | undefined,
		cachedData: RundownSegment | undefined,
		newRank: number
	) {
		if (!iNewsData) {
			this.logger.error(
				`Orphaned segment: ${segmentId}. Gateway expected segment to exist but it has been removed from iNews.`
			)
			return
		}

		const downloadedSegment: RundownSegment = new RundownSegment(
			iNewsData.rundownId,
			iNewsData.iNewsStory,
			iNewsData.modified,
			iNewsData.locator,
			iNewsData.externalId,
			newRank,
			iNewsData.name
		)

		if (cachedData === undefined) {
			// Not previously existing, it has been created
			this.logger.debug(`Creating segment: ${segmentId}`)
			this.emit('segment_create', rundownId, segmentId, downloadedSegment)
		} else {
			// Previously existed, diff for changes

			if (!_.isEqual(downloadedSegment.serialize(), cachedData.serialize())) {
				this.emit('segment_update', rundownId, segmentId, downloadedSegment)
			}
		}
	}
}
