import { EventEmitter } from 'events'
import * as dotenv from 'dotenv'
import { InewsRundown } from './datastructures/Rundown'
import { RundownManager } from './RundownManager'
import * as _ from 'underscore'
import { RundownSegment } from './datastructures/Segment'
import { RundownPart } from './datastructures/Part'
import * as clone from 'clone'
import { CoreHandler } from '../coreHandler'
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
		((event: 'segment_update', listener: (runningOrderId: string, sectionId: string, newSection: RundownSegment) => void) => this) &

		((event: 'part_delete', listener: (runningOrderId: string, sectionId: string, storyId: string) => void) => this) &
		((event: 'part_create', listener: (runningOrderId: string, sectionId: string, storyId: string, newStory: RundownPart) => void) => this) &
		((event: 'part_update', listener: (runningOrderId: string, sectionId: string, storyId: string, newStory: RundownPart) => void) => this)

	// Fast = list diffs, Slow = fetch All
	public pollIntervalFast: number = 2 * 1000
	public pollIntervalSlow: number = 10 * 1000
	public pollIntervalMedia: number = 5 * 1000

	private runningOrders: { [runningOrderId: string]: InewsRundown } = {}

	private fastInterval: NodeJS.Timer | undefined
	private slowinterval: NodeJS.Timer | undefined
	private mediaPollInterval: NodeJS.Timer | undefined

	private currentlyChecking: boolean = false
	private rundownManager: RundownManager
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
		private coreHandler: CoreHandler,
		private iNewsConnection: any,
		private iNewsQueue: Array<INewsQueue>,
		private gatewayVersion: string,
		delayStart?: boolean
	) {
		super()
		this._logger = this.logger

		this.rundownManager = new RundownManager(this._logger, this.iNewsConnection)

		if (!delayStart) {
			this.startWatcher()
		}
	}

	fakeRundown () {
		// TODO: Remove for production
		if (process.env.DEV) {
			console.log('DEV MODE')
			let ftpData = require('./fakeFTPData')
			let rundown = this.rundownManager.convertNSMLtoSofie(this._logger, '135381b4-f11a-4689-8346-b298b966664f', '135381b4-f11a-4689-8346-b298b966664f', ftpData.default, this.coreHandler.GetOutputLayers())
			console.log(rundown)
			this.emit('rundown_create', '135381b4-f11a-4689-8346-b298b966664f', rundown)
		}
	}

	/**
	 * Start the watcher
	 */
	startWatcher () {
		this.logger.info('Clear all wathcers')
		this.stopWatcher()
		this.logger.info('Start wathcers')

		this.fastInterval = setInterval(() => {
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
				this.rundownManager.emptyInewsFtpBuffer()
				// console.log('slow check done')
				this.currentlyChecking = false
			}).catch(console.error)
		}, this.pollIntervalFast)
	}

	/**
	 * Stop the watcher
	 */
	stopWatcher () {
		if (this.fastInterval) {
			clearInterval(this.fastInterval)
			this.fastInterval = undefined
		}
		if (this.slowinterval) {
			clearInterval(this.slowinterval)
			this.slowinterval = undefined
		}
		if (this.mediaPollInterval) {
			clearInterval(this.mediaPollInterval)
			this.mediaPollInterval = undefined
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

	async checkINewsRundownById (runningOrderId: string): Promise<InewsRundown> {
		const runningOrder = await this.rundownManager.downloadRunningOrder(runningOrderId, this.coreHandler.GetOutputLayers())
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

				// Go through the sections for changes:
				_.uniq(
					oldRundown.segments.map(segment => segment.externalId).concat(
					newRundown.segments.map(segment => segment.externalId))
				).forEach((segmentId: string) => {
					const oldSection: RundownSegment = oldRundown.segments.find(segment => segment.externalId === segmentId) as RundownSegment // TODO: handle better
					const newSection: RundownSegment = rundown.segments.find(segment => segment.externalId === segmentId) as RundownSegment

					if (!newSection && oldSection) {
						this.emit('segment_delete', rundownId, segmentId)
					} else if (newSection && !oldSection) {
						this.emit('segment_create', rundownId, segmentId, newSection)
					} else if (newSection && oldSection) {

						if (!_.isEqual(newSection.serialize(), oldSection.serialize())) {
							console.log(newSection.serialize(), oldSection.serialize()) // debug
							this.emit('segment_update', rundownId, segmentId, newSection)
						} else {

							// Go through the stories for changes:
							_.uniq(
								oldSection.parts.map(part => part.externalId).concat(
								newSection.parts.map(part => part.externalId))
							).forEach((storyId: string) => {

								const oldStory: RundownPart = oldSection.parts.find(part => part.externalId === storyId) as RundownPart // TODO handle the possibility of a missing id better
								const newStory: RundownPart = newSection.parts.find(part => part.externalId === storyId) as RundownPart

								if (!newStory && oldStory) {
									this.emit('part_delete', rundownId, segmentId, storyId)
								} else if (newStory && !oldStory) {
									this.emit('part_create', rundownId, segmentId, storyId, newStory)
								} else if (newStory && oldStory) {

									if (!_.isEqual(newStory.serialize(), oldStory.serialize())) {
										console.log(newStory.serialize(), oldStory.serialize()) // debug
										this.emit('part_update', rundownId, segmentId, storyId, newStory)
									} else {

										// At this point, we've determined that there are no changes.
										// Do nothing
									}
								}
							})
						}
					}
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
