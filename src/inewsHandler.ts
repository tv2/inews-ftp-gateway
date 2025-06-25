import * as _ from 'underscore'
import { CoreHandler } from './coreHandler'
import { RundownWatcher, RundownMap, ReducedRundown, ReducedSegment } from './classes/RundownWatcher'
import { literal } from './helpers'
import { RundownSegment } from './classes/datastructures/Segment'
import { VERSION } from './version'
import { ILogger as Logger } from '@tv2media/logger'
import { StatusCode } from '@sofie-automation/shared-lib/dist/lib/status'
import { PeripheralDeviceAPIMethods } from '@sofie-automation/shared-lib/dist/peripheralDevice/methodsAPI'
import {
	PeripheralDeviceForDevice,
	PeripheralDevicePubSubCollectionsNames,
} from '@sofie-automation/server-core-integration'
import { HttpInewsClient } from './proxy/HttpInewsClient'

export interface INewsDeviceSettings {
	hosts?: Array<string>
	user?: string
	password?: string
	queues?: Array<string>
	debug?: boolean
}

export class InewsFTPHandler {
	// public iNewsConnection?: inews.INewsClient
	public userName?: string
	public passWord?: string
	public debugLogging: boolean = false

	public iNewsWatcher?: RundownWatcher

	private _httpClient: HttpInewsClient | undefined
	private _logger: Logger
	private _disposed: boolean = false
	private _settings?: INewsDeviceSettings
	private _coreHandler: CoreHandler
	private _isConnected: boolean = false

	constructor(logger: Logger, coreHandler: CoreHandler) {
		this._logger = logger.tag(this.constructor.name)
		this._coreHandler = coreHandler
		// this._httpClient will be initialized later
	}

	get isConnected(): boolean {
		return this._isConnected
	}

	async init(coreHandler: CoreHandler): Promise<void> {
		let peripheralDevice = await coreHandler.core.getPeripheralDevice()
		this._settings = (peripheralDevice.deviceSettings || {}) as INewsDeviceSettings

		try {
			await this._setupDevices()
		} catch (error) {
			this._logger.data(error).error('Error during setup devices:')
		}
	}

	// Why is this async?
	async dispose(): Promise<void> {
		this._disposed = true
		if (this.iNewsWatcher) {
			return this.iNewsWatcher.dispose()
		}
	}

	/**
	 * Find this peripheral device in peripheralDevices collection.
	 */
	private getThisPeripheralDevice(): PeripheralDeviceForDevice | undefined {
		let peripheralDevices = this._coreHandler.core.getCollection(
			PeripheralDevicePubSubCollectionsNames.peripheralDeviceForDevice
		)
		return peripheralDevices.findOne(this._coreHandler.core.deviceId)
	}

	/**
	 * Set up this device.
	 */
	private async _setupDevices(): Promise<void> {
		if (this._disposed) return
		if (!this._settings) return
		if (!this._settings.hosts) throw new Error('No hosts available')
		if (!this._settings.queues) throw new Error('No queues set')

		// Instantiate the HTTP client for the proxy
		this._httpClient = new HttpInewsClient(this._settings)

		// Connection status will be checked as part of rundown polling

		if (!this.iNewsWatcher) {
			let peripheralDevice = this.getThisPeripheralDevice()
			if (peripheralDevice) {
				await this._coreHandler.setStatus(StatusCode.UNKNOWN, ['Initializing..'])
				const queues = (this._settings.queues ?? []).filter((q) => !!q)
				this.iNewsWatcher = new RundownWatcher(
					this._logger,
					this._httpClient, // Pass the HTTP client
					this._coreHandler,
					this._settings.queues,
					VERSION,
					this
				)

				this.updateChanges(this.iNewsWatcher)

				queues.forEach((q) => {
					this._logger.info(`Starting watch of ${q}`)
				})
			}
		}
	}

	/**
	 *  Get the current rundown state from Core and convert it to rundowns.
	 */
	async ingestDataToRundowns(gatewayVersion: string, rundownExternalIds: string[]): Promise<RundownMap> {
		let rundownsCache: RundownMap = new Map()

		if (!rundownExternalIds.length) {
			return rundownsCache
		}

		let coreRundowns = await this._coreHandler.GetRundownCache(rundownExternalIds)

		coreRundowns.forEach((ingestRundown) => {
			let rundown: ReducedRundown = {
				externalId: ingestRundown.externalId,
				name: ingestRundown.name,
				gatewayVersion: ingestRundown.payload.gatewayVersion || gatewayVersion,
				segments: [],
			}

			ingestRundown.segments.forEach((ingestSegment) => {
				rundown.segments.push(
					literal<ReducedSegment>({
						externalId: ingestSegment.externalId,
						name: ingestSegment.name,
						modified: (ingestSegment.payload as RundownSegment).modified,
						rank: ingestSegment.rank,
						locator: (ingestSegment.payload as RundownSegment).iNewsStory.locator,
					})
				)
			})

			rundownsCache.set(ingestRundown.externalId, rundown)
		})

		return rundownsCache
	}

	updateChanges(iNewsWatcher: RundownWatcher) {
		iNewsWatcher
			.on('info', (message: any) => {
				this._logger.info(message)
			})
			.on('error', (error: any) => {
				this._logger.error(error)
			})
			.on('warning', (warning: any) => {
				this._logger.error(warning)
			})
			.on('rundown_delete', (rundownExternalId) => {
				this._coreHandler.core
					.callMethodRaw(PeripheralDeviceAPIMethods.dataRundownDelete, [rundownExternalId])
					.catch(this._logger.error)
			})
			.on('rundown_create', (_rundownExternalId, rundown) => {
				this._coreHandler.core
					.callMethodRaw(PeripheralDeviceAPIMethods.dataRundownCreate, [rundown])
					.catch(this._logger.error)
			})
			.on('rundown_update', (_rundownExternalId, rundown) => {
				this._coreHandler.core
					.callMethodRaw(PeripheralDeviceAPIMethods.dataRundownUpdate, [rundown])
					.catch(this._logger.error)
			})
			.on('rundown_metadata_update', (_rundownExternalId, rundown) => {
				this._coreHandler.core
					.callMethodRaw(PeripheralDeviceAPIMethods.dataRundownMetaDataUpdate, [rundown])
					.catch(this._logger.error)
			})
			.on('segment_delete', (rundownExternalId, segmentId) => {
				this._coreHandler.core
					.callMethodRaw(PeripheralDeviceAPIMethods.dataSegmentDelete, [rundownExternalId, segmentId])
					.catch(this._logger.error)
			})
			.on('segment_create', (rundownExternalId, _segmentId, newSegment) => {
				this._coreHandler.core
					.callMethodRaw(PeripheralDeviceAPIMethods.dataSegmentCreate, [rundownExternalId, newSegment])
					.catch(this._logger.error)
			})
			.on('segment_update', (rundownExternalId, _segmentId, newSegment) => {
				this._coreHandler.core
					.callMethodRaw(PeripheralDeviceAPIMethods.dataSegmentUpdate, [rundownExternalId, newSegment])
					.catch(this._logger.error)
			})
			.on('segment_ranks_update', (rundownExteralId, newRanks) => {
				this._coreHandler.core.callMethodRaw(PeripheralDeviceAPIMethods.dataSegmentRanksUpdate, [
					rundownExteralId,
					newRanks,
				])
			})
	}

	restartWatcher(): void {
		this._logger.info(`Restarting watchers`)
		this.iNewsWatcher?.startWatcher()
	}

	public async checkHealthAndUpdateStatus(): Promise<boolean> {
		try {
			const health = await this._httpClient?.getHealth()
			console.log('health', health)
			const wasConnected = this._isConnected
			this._isConnected = health && health.status === 'ok' && health.inewsConnected === true
			if (!wasConnected && this._isConnected) {
				this._logger.info('Connected to iNews HTTP API')
				await this._coreHandler.setStatus(StatusCode.GOOD, ['Connected to iNews HTTP API'])
			} else if (wasConnected && !this._isConnected) {
				this._logger.warn('Disconnected from iNews HTTP API')
				await this._coreHandler.setStatus(StatusCode.BAD, ['No servers available'])
			}
		} catch (err) {
			if (this._isConnected) {
				this._logger.warn('Lost connection to iNews HTTP API', err as any)
				await this._coreHandler.setStatus(StatusCode.BAD, ['No servers available'])
			}
			this._isConnected = false
		}
		return this._isConnected
	}
}
