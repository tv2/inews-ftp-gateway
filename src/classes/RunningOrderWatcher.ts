import { EventEmitter } from 'events'
import * as dotenv from 'dotenv'
import { InewsRundown } from './datastructures/Rundown'
import { RundownManager } from './RundownManager'
import * as _ from 'underscore'
import { RundownSegment } from './datastructures/Segment'
import * as clone from 'clone'
import * as Winston from 'winston'
import { INewsQueue } from '../inewsHandler'

dotenv.config()

export class RunningOrderWatcher extends EventEmitter {

	on: ((event: 'info', listener: (message: string) => void) => this) &
		((event: 'error', listener: (error: any, stack?: any) => void) => this) &
		((event: 'warning', listener: (message: string) => void) => this) &

		((event: 'rundown_delete', listener: (runningOrderId: string) => void) => this) &
		((event: 'rundown_create', listener: (runningOrderId: string, runningOrder: InewsRundown) => void) => this) &
		((event: 'rundown_update', listener: (runningOrderId: string, runningOrder: InewsRundown) => void) => this) &

		((event: 'segment_delete', listener: (runningOrderId: string, sectionId: string) => void) => this) &
		((event: 'segment_create', listener: (runningOrderId: string, sectionId: string, newSection: RundownSegment) => void) => this) &
		((event: 'segment_update', listener: (runningOrderId: string, sectionId: string, newSection: RundownSegment) => void) => this)

	// Fast = list diffs, Slow = fetch All
	public pollInterval: number = 2 * 1000

	private pollTimer: NodeJS.Timer | undefined

	private currentlyChecking: boolean = false
	public rundownManager: RundownManager
	private _logger: Winston.LoggerInstance

	/**
	 * A Running Order watcher which will poll iNews FTP server for changes and emit events
	 * whenever a change occurs.
	 *
	 * @param coreHandler Handler for Sofie Core
	 * @param gatewayVersion Set version of gateway
	 * @param delayStart (Optional) Set to a falsy value to prevent the watcher to start watching immediately.
	 */
	constructor (
		private logger: Winston.LoggerInstance,
		private iNewsConnection: any,
		private iNewsQueue: Array<INewsQueue>,
		private gatewayVersion: string,
		private runningOrders: { [runningOrderId: string]: InewsRundown },
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
		this.logger.info('Clear all wathcers')
		this.stopWatcher()
		this.logger.info('Start wathcers')

		this.pollTimer = setInterval(() => {
			if (this.currentlyChecking) {
				return
			}
			this.logger.info('Check rundowns for updates')
			this.currentlyChecking = true

			this.checkINewsRundowns()
			.catch(error => {
				this.logger.error('Something went wrong during check', error, error.stack)
			})
			.then(() => {
				this.rundownManager.EmptyInewsFtpBuffer()
				// console.log('slow check done')
				this.currentlyChecking = false
			}).catch(console.error)
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

	async checkINewsRundowns (): Promise<InewsRundown[]> {
		return Promise.all(this.iNewsQueue.map(roId => {
			return this.checkINewsRundownById(roId.queue)
		}))
	}

	public async DownloadRunningOrderById (runningOrderId: string) {
		delete this.runningOrders[runningOrderId]
		return this.rundownManager.downloadRunningOrder(runningOrderId, this.runningOrders[runningOrderId])
	}

	async checkINewsRundownById (runningOrderId: string): Promise<InewsRundown> {
		const runningOrder = await this.rundownManager.downloadRunningOrder(runningOrderId, this.runningOrders[runningOrderId])
		if (runningOrder.gatewayVersion === this.gatewayVersion) {
			this.processUpdatedRunningOrder(runningOrder.externalId, runningOrder)
		}
		return runningOrder
	}

	private processUpdatedRunningOrder (rundownId: string, rundown: InewsRundown | null) {

		const oldRundown = this.runningOrders[rundownId]

		// Check if runningOrders have changed:
		if (!rundown && oldRundown) {
			this.emit('rundown_delete', rundownId)
		} else if (rundown && !oldRundown) {
			this.emit('rundown_create', rundownId, rundown)
		} else if (rundown && oldRundown) {

			if (!_.isEqual(rundown.serialize(), oldRundown.serialize())) {

				console.log(rundown.serialize()) // debug

				this.emit('rundown_update', rundownId, rundown)
			} else {
				const newRundown: InewsRundown = rundown
				let segmentsToCreate: RundownSegment[] = []
				// Go through the new segments for changes:
				newRundown.segments.forEach((segment: RundownSegment) => {
					let oldSegment: RundownSegment = oldRundown.segments.find(item => item.externalId === segment.externalId) as RundownSegment // TODO: handle better
					if (!oldSegment) {
						// If name and first part of of ID is the same:
						let tempOldSegment = oldRundown.segments.find(item => item.name === segment.name) as RundownSegment
						if (tempOldSegment) {
							if (tempOldSegment.externalId.substring(0, 8) === segment.externalId.substring(0, 8)) {
								oldSegment = tempOldSegment
								segment.externalId = tempOldSegment.externalId
							}
						} else {
							// If everything except name, id, fileId and modifyDate is the same:
							let tempNewSegment: RundownSegment = clone(segment)
							let tempOldSegment = oldRundown.segments.find(item => item.rank === segment.rank) as RundownSegment
							tempNewSegment.iNewsStory.id = tempOldSegment.iNewsStory.id
							tempNewSegment.iNewsStory.fileId = tempOldSegment.iNewsStory.fileId
							tempNewSegment.iNewsStory.fields.title = tempOldSegment.iNewsStory.fields.title
							tempNewSegment.iNewsStory.fields.modifyDate = tempOldSegment.iNewsStory.fields.modifyDate
							if (JSON.stringify(tempNewSegment.iNewsStory) === JSON.stringify(tempOldSegment.iNewsStory)) {
								oldSegment = tempOldSegment
								segment.externalId = tempOldSegment.externalId
							}
						}
					}

					// Update if needed:
					if (segment && !oldSegment) {
						segmentsToCreate.push(segment)
					} else {
						if (!_.isEqual(segment.serialize(), oldSegment.serialize())) {
							this.emit('segment_update', rundownId, segment.externalId, segment)
						}
					}
				})

				// Go through the old segments for deletion:
				oldRundown.segments.forEach((oldSegment: RundownSegment) => {
					if (!rundown.segments.find(segment => segment.externalId === oldSegment.externalId)) {
						this.emit('segment_delete', rundownId, oldSegment.externalId)
					}
				})
				// Go through the segments for creation:
				segmentsToCreate.forEach((segment: RundownSegment) => {
					this.emit('segment_create', rundownId, segment.externalId, segment)
				})
			}
		}

		// Update the stored data:
		if (rundown) {
			this.runningOrders[rundownId] = clone(rundown)
		} else {
			delete this.runningOrders[rundownId]
		}
	}

}
