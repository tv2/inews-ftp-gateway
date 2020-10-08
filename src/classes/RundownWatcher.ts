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
import { ProcessUpdatedRundown } from './ProcessUpdatedRundown'

dotenv.config()

export enum RundownChangeType {
	RUNDOWN_CREATE,
	RUNDOWN_UPDATE,
	RUNDOWN_DELETE,
	SEGMENT_UPDATE,
	SEGMENT_DELETE,
	SEGMENT_CREATE
}

export interface RundownChangeBase {
	type: RundownChangeType,
	rundownExternalId: string
}

export interface RundownChangeRundownCreate extends RundownChangeBase {
	type: RundownChangeType.RUNDOWN_CREATE,
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
}

export type RundownChange = RundownChangeRundownCreate | RundownChangeRundownDelete | RundownChangeRundownUpdate | RundownChangeSegmentCreate | RundownChangeSegmentDelete | RundownChangeSegmentUpdate

export type ReducedRundown = Pick<INewsRundown, 'externalId' | 'name' | 'gatewayVersion'> & { segments: ReducedSegment[] }
export type ReducedSegment = Pick<ISegment, 'externalId' | 'modified' | 'rank' | 'name'>

export type RundownMap = Map<string, ReducedRundown>

export class RundownWatcher extends EventEmitter {

	on!: ((event: 'info', listener: (message: string) => void) => this) &
		((event: 'error', listener: (error: any, stack?: any) => void) => this) &
		((event: 'warning', listener: (message: string) => void) => this) &

		((event: 'rundown_delete', listener: (rundownId: string) => void) => this) &
		((event: 'rundown_create', listener: (rundownId: string, rundown: INewsRundown) => void) => this) &
		((event: 'rundown_update', listener: (rundownId: string, rundown: INewsRundown) => void) => this) &

		((event: 'segment_delete', listener: (rundownId: string, segmentId: string) => void) => this) &
		((event: 'segment_create', listener: (rundownId: string, segmentId: string, newSegment: RundownSegment) => void) => this) &
		((event: 'segment_update', listener: (rundownId: string, segmentId: string, newSegment: RundownSegment) => void) => this) // TODO: Change to IngestSegment + IngestRundown

	// Fast = list diffs, Slow = fetch All
	public pollInterval: number = 2000

	private pollTimer: NodeJS.Timer | undefined

	private currentlyChecking: boolean = false
	public rundownManager: RundownManager
	private _logger: Winston.LoggerInstance

	/**
	 * A Rundown watcher which will poll iNews FTP server for changes and emit events
	 * whenever a change occurs.
	 *
	 * @param coreHandler Handler for Sofie Core
	 * @param gatewayVersion Set version of gateway
	 * @param delayStart (Optional) Set to a falsy value to prevent the watcher to start watching immediately.
	 */
	constructor (
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

		this.rundownManager = new RundownManager(this._logger, this.iNewsConnection)

		if (!delayStart) {
			this.startWatcher()
		}
	}

	/**
	 * Start the watcher
	 */
	startWatcher () {
		this.logger.info('Clear all watchers')
		this.stopWatcher()
		this.logger.info('Start watchers')
		let passoverTimings = 0
		// First run
		this.currentlyChecking = true
		this.checkINewsRundowns().then(async queueList => {
			console.log('DUMMY LOG : ', queueList)
			this.currentlyChecking = false
			if (this.handler.isConnected) {
				await this.coreHandler.setStatus(P.StatusCode.GOOD, [`Watching iNews Queues`])
			}
		}, err => {
			this._logger.error('Error in iNews Rundown list', err)
			this.currentlyChecking = false
		}).catch(this._logger.error)

		// Subsequent runs
		this.pollTimer = setInterval(() => {
			if (this.currentlyChecking) {
				if (passoverTimings++ > 10) {
					this._logger.warn(`Check iNews rundown has been skipped ${passoverTimings} times.`)
					if (this.handler.isConnected) {
						this.coreHandler.setStatus(P.StatusCode.WARNING_MINOR,
							[`Check iNews not run for ${passoverTimings * this.pollInterval}ms`]).catch(this.logger.error)
					}
				}
				return
			} else {
				passoverTimings = 0
			}
			this.logger.info('Check rundowns for updates')
			this.currentlyChecking = true

			this.checkINewsRundowns().then(async () => {
				// this.rundownManager.EmptyInewsFtpBuffer()
				if (this.iNewsConnection.queueLength() > 0) {
					this.logger.error(`INews library queue length was ${this.iNewsConnection.queueLength()} when it should be 0.`)
				}
				// console.log('slow check done')
				this.currentlyChecking = false
				if (this.handler.isConnected) {
					await this.coreHandler.setStatus(P.StatusCode.GOOD, [`Watching iNews Queues`])
				}
			}, error => {
				this.logger.error('Something went wrong during check', error, error.stack)
				this.currentlyChecking = false
				return this.coreHandler.setStatus(P.StatusCode.WARNING_MAJOR, ['Check INews rundows failed'])
			}).catch(this._logger.error)
		}, this.pollInterval)
	}

	/**
	 * Stop the watcher
	 */
	stopWatcher () {
		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			this.pollTimer = undefined
		}
	}

	dispose () {
		this.stopWatcher()
	}

	async checkINewsRundowns (): Promise<INewsRundown[]> {
		return Promise.all(this.iNewsQueue.map(roId => {
			return this.checkINewsRundownById(roId.queues)
		}))
	}

	async checkINewsRundownById (rundownId: string): Promise<INewsRundown> {
		const storedRundown = this.rundowns.get(rundownId)
		const rundown = await this.rundownManager.downloadRundown(rundownId, storedRundown)
		if (rundown.gatewayVersion === this.gatewayVersion) {
			this.processUpdatedRundown(rundown.externalId, rundown)
		}
		return rundown
	}

	private processUpdatedRundown (rundownId: string, rundown: INewsRundown) {
		const updates = ProcessUpdatedRundown(rundownId, rundown, this.rundowns, this.logger)

		this.rundowns.set(rundownId, rundown)

		updates.forEach((update) => {
			switch (update.type) {
				case RundownChangeType.RUNDOWN_DELETE:
					this.emit('rundown_delete', update.rundownExternalId)
					break
				case RundownChangeType.RUNDOWN_CREATE:
					this.emit('rundown_create', update.rundownExternalId, rundown)
					break
				case RundownChangeType.RUNDOWN_UPDATE:
					this.emit('rundown_update', update.rundownExternalId, rundown)
					break
				case RundownChangeType.SEGMENT_UPDATE:
					this.emit(
						'segment_update',
						update.rundownExternalId,
						update.segmentExternalId,
						rundown.segments.find((segment) => segment.externalId === update.segmentExternalId)
					)
					break
				case RundownChangeType.SEGMENT_DELETE:
					this.emit(
						'segment_delete',
						update.rundownExternalId,
						update.segmentExternalId
					)
					break
				case RundownChangeType.SEGMENT_CREATE:
					this.emit(
						'segment_create',
						update.rundownExternalId,
						update.segmentExternalId,
						rundown.segments.find((segment) => segment.externalId === update.segmentExternalId)
					)
					break
			}
		})
	}

}
