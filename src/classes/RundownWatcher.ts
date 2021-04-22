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
import { IngestRundown } from '@sofie-automation/blueprints-integration'
import { mutateRundown } from '../mutate'

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

export type ReducedRundown = Pick<INewsRundown, 'externalId' | 'name' | 'gatewayVersion'> & {
	segments: ReducedSegment[]
}
export type ReducedSegment = Pick<ISegment, 'externalId' | 'modified' | 'rank' | 'name' | 'locator'>
export type UnrankedSegment = Omit<ISegment, 'rank' | 'float'>

export type RundownMap = Map<string, ReducedRundown>

const RECALCULATE_RANKS_CHANGE_THRESHOLD = 50
const MAX_TIME_BEFORE_RECALCULATE_RANKS = 60 * 60 * 1000 // One hour
const MINIMUM_ALLOWED_RANK = Math.pow(1 / 2, 30)

export class RundownWatcher extends EventEmitter {
	on!: ((event: 'info', listener: (message: string) => void) => this) &
		((event: 'error', listener: (error: any, stack?: any) => void) => this) &
		((event: 'warning', listener: (message: string) => void) => this) &
		((event: 'rundown_delete', listener: (rundownId: string) => void) => this) &
		((event: 'rundown_create', listener: (rundownId: string, rundown: IngestRundown) => void) => this) &
		((event: 'rundown_update', listener: (rundownId: string, rundown: IngestRundown) => void) => this) &
		((event: 'segment_delete', listener: (rundownId: string, segmentId: string) => void) => this) &
		((
			event: 'segment_create',
			listener: (rundownId: string, segmentId: string, newSegment: RundownSegment) => void
		) => this) &
		((
			event: 'segment_update',
			listener: (rundownId: string, segmentId: string, newSegment: RundownSegment) => void
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
		((event: 'segment_delete', rundownId: string, segmentId: string) => boolean) &
		((event: 'segment_create', rundownId: string, segmentId: string, newSegment: RundownSegment) => boolean) &
		((event: 'segment_update', rundownId: string, segmentId: string, newSegment: RundownSegment) => boolean) &
		((event: 'segment_ranks_update', rundownId: string, newRanks: { [segmentExternalId: string]: number }) => boolean)

	public pollInterval: number = 2000
	private pollTimer: NodeJS.Timeout | undefined

	public rundownManager: RundownManager
	private _logger: Winston.LoggerInstance
	private previousRanks: SegmentRankings = new Map()
	private lastForcedRankRecalculation: number

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
		this.lastForcedRankRecalculation = Date.now()

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

	public ResyncRundown(rundownExternalId: string) {
		const rundown = this.rundowns.get(rundownExternalId)

		if (!rundown) {
			return
		}

		this.rundowns.delete(rundownExternalId)
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

	static numberOfDecimals(val: number) {
		if (Math.floor(val) === val) return 0
		return val.toString().split('.')[1].length || 0
	}

	private async processUpdatedRundown(rundownId: string, rundown: ReducedRundown) {
		let { segments, changes, recalculatedAsIntegers } = ParsedINewsIntoSegments.GetUpdatesAndRanks(
			rundownId,
			rundown,
			rundown.segments,
			this.previousRanks,
			this.rundowns.get(rundownId),
			this._logger
		)

		// Check if we should recalculate ranks to integer values from scratch.
		let prevRank: number | undefined = undefined
		let minRank = Number.POSITIVE_INFINITY
		if (!recalculatedAsIntegers) {
			for (const segment of segments) {
				if (prevRank !== undefined) {
					const diffRank = segment.rank - prevRank
					minRank = Math.min(minRank, diffRank)
				}
				prevRank = segment.rank
			}
		}

		if (
			!recalculatedAsIntegers &&
			(minRank < MINIMUM_ALLOWED_RANK ||
				changes.segments.length >= RECALCULATE_RANKS_CHANGE_THRESHOLD ||
				Date.now() - this.lastForcedRankRecalculation >= MAX_TIME_BEFORE_RECALCULATE_RANKS ||
				segments.some((segment) => RundownWatcher.numberOfDecimals(segment.rank) > 3))
		) {
			segments = ParsedINewsIntoSegments.RecalculateRanksAsIntegerValues(rundownId, rundown.segments, {
				rundown: {},
				segments: [],
			}).segments

			const previousRanks = this.previousRanks.get(rundownId)

			if (previousRanks) {
				for (let segment of segments) {
					const previousRank = previousRanks.get(segment.externalId)

					if (!previousRank) {
						continue
					}

					const alreadyUpdating = changes.segments.some(
						(change) =>
							change.type === RundownChangeType.SEGMENT_UPDATE && change.segmentExternalId === segment.externalId
					)

					if (!alreadyUpdating && previousRank.rank !== segment.rank) {
						changes.segments.push(
							literal<RundownChangeSegmentRankUpdate>({
								type: RundownChangeType.SEGMENT_RANK_UPDATE,
								rundownExternalId: rundownId,
								segmentExternalId: segment.externalId,
								rank: segment.rank,
							})
						)
					}
				}
			}

			this.lastForcedRankRecalculation = Date.now()
		}

		// Store ranks
		const ranksMap = this.updatePreviousRanks(rundownId, segments)
		rundown.segments = segments
		this.rundowns.set(rundownId, rundown)

		const rundownCreated = changes.rundown.change && IsRundownChangeRundownCreate(changes.rundown.change)

		const segmentChangesCreated = changes.segments.filter(IsRundownChangeSegmentCreate)
		const segmentChangesUpdated = changes.segments.filter(IsRundownChangeSegmentUpdate)
		const segmentChangesDeleted = changes.segments.filter(IsRundownChangeSegmentDelete)
		const segmentChangesCreatedUpdated = [...segmentChangesCreated, ...segmentChangesUpdated]
		const segmentsToGetCachedData = rundownCreated ? [] : segmentChangesCreated.filter((s) => !s.skipCache)

		const iNewsDataPs: Promise<Map<string, UnrankedSegment>> = this.rundownManager.fetchINewsStoriesById(
			rundownId,
			segmentChangesCreatedUpdated.map((c) => c.segmentExternalId)
		)

		const ingestCacheDataPs: Promise<Map<string, RundownSegment>> = this.coreHandler.GetSegmentsCacheById(
			rundownId,
			segmentsToGetCachedData.map((s) => s.segmentExternalId)
		)

		const [iNewsData, ingestCacheData] = await Promise.all([iNewsDataPs, ingestCacheDataPs])

		const rundownSegments = await this.reducedSegmentsToRundownSegments(
			rundownId,
			segmentChangesCreatedUpdated.map((s) => s.segmentExternalId),
			ranksMap,
			iNewsData,
			ingestCacheData
		)

		if (changes.rundown.change) {
			await this.processAndEmitRundownChanges(rundown, changes.rundown.change, rundownSegments)
		}

		if (!rundownCreated) {
			await this.processAndEmitSegmentsDeleted(segmentChangesDeleted)
			await this.processAndEmitSegmentRankChanges(rundownId, changes.segments.filter(IsRundownChangeSegmentRankUpdate))
			await this.processAndEmitSegmentUpdates(rundownId, rundownSegments, ingestCacheData)
		}
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

	private async processAndEmitRundownChanges(
		rundown: ReducedRundown,
		change: RundownChangeRundown,
		segments: RundownSegment[]
	) {
		if (IsRundownChangeRundownDelete(change)) {
			this.emitRundownDeleted(change)
		} else if (IsRundownChangeRundownUpdate(change)) {
			this.emitRundownUpdated(rundown, change)
		} else if (IsRundownChangeRundownCreate(change)) {
			this.emitRundownCreated(rundown, change, segments)
		}
	}

	private async emitRundownDeleted(change: RundownChangeRundownDelete) {
		this.emit('rundown_delete', change.rundownExternalId)
	}

	private async emitRundownUpdated(rundown: ReducedRundown, change: RundownChangeRundownUpdate) {
		this.emit('rundown_update', change.rundownExternalId, mutateRundown(rundown, []))
	}

	private async emitRundownCreated(
		rundown: ReducedRundown,
		change: RundownChangeRundownCreate,
		segments: RundownSegment[]
	) {
		this.emit('rundown_create', change.rundownExternalId, mutateRundown(rundown, segments))
	}

	private async processAndEmitSegmentUpdates(
		rundownId: string,
		rundownSegments: RundownSegment[],
		ingestCacheData: Map<string, RundownSegment>
	) {
		if (!rundownSegments.length) {
			return
		}

		for (const segment of rundownSegments) {
			const cache = ingestCacheData.get(segment.externalId)

			this.diffSegment(rundownId, segment, cache)
		}
	}

	private async processAndEmitSegmentRankChanges(rundownId: string, updatedRanks: RundownChangeSegmentRankUpdate[]) {
		const newRanks: { [segmentExternalId: string]: number } = {}
		for (const updatedRank of updatedRanks) {
			newRanks[updatedRank.segmentExternalId] = updatedRank.rank
		}
		this.emit('segment_ranks_update', rundownId, newRanks)
	}

	private async processAndEmitSegmentsDeleted(deletedSegments: RundownChangeSegmentDelete[]) {
		for (const segment of deletedSegments) {
			this.emit('segment_delete', segment.rundownExternalId, segment.segmentExternalId)
		}
	}

	/**
	 * Compares the cached version of a segment to updates from iNews. Emits updates if changes have occured
	 * @param rundownId Rundown to send updates to
	 * @param segmentId Segment external Id
	 * @param iNewsData Data fetched from iNews
	 * @param cachedData Data fetched from ingestDataCache
	 */
	private diffSegment(rundownId: string, segment: RundownSegment, cachedData: RundownSegment | undefined) {
		if (cachedData === undefined) {
			// Not previously existing, it has been created
			this.logger.debug(`Creating segment: ${segment.externalId}`)
			this.emit('segment_create', rundownId, segment.externalId, segment)
		} else {
			// Previously existed, diff for changes

			if (!_.isEqual(segment.serialize(), cachedData.serialize())) {
				this.emit('segment_update', rundownId, segment.externalId, segment)
			}
		}
	}

	private reducedSegmentsToRundownSegments(
		rundownId: string,
		segmentExternalIds: string[],
		segmentRanks: Map<string, SegmentRankingsInner>,
		iNewsData: Map<string, UnrankedSegment>,
		ingestCacheData: Map<string, RundownSegment>
	): RundownSegment[] {
		const segments: RundownSegment[] = []

		for (const segmentExternalId of segmentExternalIds) {
			const cache = ingestCacheData.get(segmentExternalId)
			const inews = iNewsData.get(segmentExternalId)

			const newSegmentRankAssignement = segmentRanks.get(segmentExternalId)?.rank || cache?.rank

			this._logger.debug(`Rundown ${rundownId} Segment ${segmentExternalId} Rank ${newSegmentRankAssignement}`)

			if (!inews) {
				this.logger.error(
					`Orphaned segment: ${segmentExternalId}. Gateway expected segment to exist but it has been removed from iNews.`
				)
				continue
			}

			// If no rank is assigned, update is not safe
			if (newSegmentRankAssignement !== undefined) {
				segments.push(this.rundownSegmentFromINewsData(inews, newSegmentRankAssignement))
			} else {
				this.logger.error(`Segment ${segmentExternalId} has not been assigned a rank`)
			}
		}

		return segments
	}

	private rundownSegmentFromINewsData(iNewsData: UnrankedSegment, newRank: number): RundownSegment {
		return new RundownSegment(
			iNewsData.rundownId,
			iNewsData.iNewsStory,
			iNewsData.modified,
			iNewsData.locator,
			iNewsData.externalId,
			newRank,
			iNewsData.name
		)
	}
}
