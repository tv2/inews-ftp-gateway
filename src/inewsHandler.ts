import * as _ from 'underscore'
import * as Winston from 'winston'
import {
	CollectionObj,
	PeripheralDeviceAPI as P
} from 'tv-automation-server-core-integration'
import { CoreHandler } from './coreHandler'
import { RundownWatcher, RundownMap } from './classes/RundownWatcher'
import { INewsRundown } from './classes/datastructures/Rundown'
import { mutateRundown, mutateSegment } from './mutate'
import * as inews from 'inews'
// @ts-ignore
// import inews from '@johnsand/inews'
import { RundownSegment, INewsStoryGW } from './classes/datastructures/Segment'

type INewsClient = inews.INewsClient
type INewsOptions = inews.INewsOptions

const emptyStory = (): INewsStoryGW => {
	return { fields: {}, meta: {}, cues: [], fileId: '', identifier: '' }
}

export interface INewsDeviceSettings {
	hosts: Array<INewsHost>
	user: string
	password: string
	queues: Array<INewsQueue>
}

export interface INewsHost {
	_id: string
	host: string
}

export interface INewsQueue {
	_id: string
	type: string
	queues: string
}

export class InewsFTPHandler {

	public iNewsConnection?: INewsClient
	public userName?: string
	public passWord?: string
	public debugLogging: boolean = false

	public iNewsWatcher?: RundownWatcher

	private _logger: Winston.LoggerInstance
	private _disposed: boolean = false
	private _settings?: INewsDeviceSettings
	private _coreHandler: CoreHandler
	private _isConnected: boolean = false
	private _reconnectAttempts: number = 0

	constructor (logger: Winston.LoggerInstance, coreHandler: CoreHandler) {
		this._logger = logger
		this._coreHandler = coreHandler
	}

	get isConnected (): boolean {
		return this._isConnected
	}

	async init (coreHandler: CoreHandler): Promise<void> {
		let peripheralDevice = await coreHandler.core.getPeripheralDevice()
		this._settings = peripheralDevice.settings || {}

		try {
			await this._setupDevices()
		} catch (err) {
			this._logger.error('Error during setup devices', err, err.stack)
		}
	}

	// Why is this async?
	async dispose (): Promise<void> {
		this._disposed = true
		if (this.iNewsWatcher) {
			return this.iNewsWatcher.dispose()
		}
	}

	/**
	 * Find this peripheral device in peripheralDevices collection.
	 */
	private getThisPeripheralDevice (): CollectionObj | undefined {
		let peripheralDevices = this._coreHandler.core.getCollection('peripheralDevices')
		return peripheralDevices.findOne(this._coreHandler.core.deviceId)
	}

	/**
	 * Set up this device.
	 */
	private async _setupDevices (): Promise<void> {
		if (this._disposed) return
		if (!this._settings) return
		if (!this._settings.hosts) throw new Error('No hosts available')
		if (!this._settings.queues) throw new Error('No queues set')
		this.iNewsConnection = inews({
			hosts: this._settings.hosts.map(host => host.host),
			user: this._settings.user,
			password: this._settings.password,
			timeout: 10000
		} as INewsOptions)

		this.iNewsConnection.on('status', async status => {
			if (status.name === 'disconnected') {
				if (this._isConnected) {
					this._isConnected = false
					this._reconnectAttempts = 0
					await this._coreHandler.setStatus(P.StatusCode.WARNING_MAJOR, ['Attempting to reconnect'])
					this._logger.warn(`Disconnected from iNews at ${status.host}`)
				} else {
					this._reconnectAttempts++
					if (this._reconnectAttempts >= this._settings!.hosts.length) {
						await this._coreHandler.setStatus(P.StatusCode.BAD, ['No servers available'])
						this._logger.warn(`Cannot connect to any of the iNews hosts`)
					}
				}
			} else if (status.name === 'connected') {
				this._isConnected = true
				this._logger.info(`Connected to iNews at ${status.host}`)
			} else if (status.name === 'connecting') {
				this._logger.info(`Connecting to iNews at ${status.host}`)
			}
		})

		this.iNewsConnection.on('error', error => {
			this._logger.error('FTP error:', error.message)
		})

		if (!this.iNewsWatcher) {
			let peripheralDevice = this.getThisPeripheralDevice()
			if (peripheralDevice) {
				await this._coreHandler.setStatus(P.StatusCode.UNKNOWN, ['Initializing..'])
				this.iNewsWatcher = new RundownWatcher(
					this._logger, this.iNewsConnection,
					this._coreHandler, this._settings.queues,
					'v0.2', this.ingestDataToRundowns('v0.2'),
					this)

				this.updateChanges(this.iNewsWatcher)

				this._settings.queues.forEach((q) => {
					this._logger.info(`Starting watch of `, q.queues)
				})
			}
		}
	}

	/**
	 *  Get the current rundown state from Core and convert it to rundowns.
	 */
	ingestDataToRundowns (gatewayVersion: string): RundownMap {
		// let coreRundowns = this._coreHandler.GetRundownList()
		let coreCache = this._coreHandler.GetRundownCache()
		let rundowns = coreCache.filter(item => item.type === 'rundown')
		let rundownsCache: RundownMap = {}

		rundowns.forEach((rundownHeader: any) => {
			let segments = [new RundownSegment('',emptyStory(),'0','',0,'',false)]
			let rundown = new INewsRundown(
				rundownHeader.data.externalId,
				rundownHeader.data.name,
				gatewayVersion,
				[]
			)
			coreCache.forEach((segment: any) => {
				if (segment.rundownId === rundownHeader.rundownId && segment.type === 'segment' && segment.data.payload.iNewsStory) {
					segments[segment.data.rank] = new RundownSegment(
						segment.data.payload.rundownId,
						segment.data.payload.iNewsStory,
						segment.data.payload.iNewsStory.fields.modifyDate || '0',
						segment.data.payload.externalId,
						segment.data.payload.rank,
						segment.data.payload.name,
						segment.data.payload.float
					)
				}
			})
			if (segments[0].rundownId === '') {
				segments = []
			}
			rundown.segments = segments
			rundownsCache[rundownHeader.data.externalId] = rundown
		})
		return rundownsCache
	}

	updateChanges (iNewsWatcher: RundownWatcher) {
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
			this._coreHandler.core.callMethod(P.methods.dataRundownDelete, [rundownExternalId]).catch(this._logger.error)
		})
		.on('rundown_create', (_rundownExternalId, rundown) => {
			this._coreHandler.core.callMethod(P.methods.dataRundownCreate, [mutateRundown(rundown)]).catch(this._logger.error)
		})
		.on('rundown_update', (_rundownExternalId, rundown) => {
			this._coreHandler.core.callMethod(P.methods.dataRundownUpdate, [mutateRundown(rundown)]).catch(this._logger.error)
		})
		.on('segment_delete', (rundownExternalId, segmentId) => {
			this._coreHandler.core.callMethod(P.methods.dataSegmentDelete, [rundownExternalId, segmentId]).catch(this._logger.error)
		})
		.on('segment_create', (rundownExternalId, _segmentId, newSegment) => {
			this._coreHandler.core.callMethod(P.methods.dataSegmentCreate, [rundownExternalId, mutateSegment(newSegment)]).catch(this._logger.error)
		})
		.on('segment_update', (rundownExternalId, _segmentId, newSegment) => {
			this._coreHandler.core.callMethod(P.methods.dataSegmentUpdate, [rundownExternalId, mutateSegment(newSegment)]).catch(this._logger.error)
		})
	}
}
