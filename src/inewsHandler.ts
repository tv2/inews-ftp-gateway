import * as _ from 'underscore'
import * as Winston from 'winston'
import {
	CollectionObj,
	PeripheralDeviceAPI as P
} from 'tv-automation-server-core-integration'
import { CoreHandler } from './coreHandler'
import { RunningOrderWatcher } from './classes/RunningOrderWatcher'
import { InewsRundown } from './classes/datastructures/Rundown'
import { mutateRundown, mutateSegment } from './mutate'
import * as inews from '@johnsand/inews'
import { RundownSegment } from './classes/datastructures/Segment'

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
	queue: string
}

export class InewsFTPHandler {

	public iNewsConnection: any
	public userName: string
	public passWord: string
	public debugLogging: boolean = false

	private iNewsWatcher?: RunningOrderWatcher

	private _logger: Winston.LoggerInstance
	private _disposed: boolean = false
	private _settings?: INewsDeviceSettings
	private _coreHandler: CoreHandler

	constructor (logger: Winston.LoggerInstance, coreHandler: CoreHandler) {
		this._logger = logger
		this._coreHandler = coreHandler
	}

	init (coreHandler: CoreHandler): Promise<void> {
		return coreHandler.core.getPeripheralDevice()
		.then((peripheralDevice: any) => {
			this._settings = peripheralDevice.settings || {}

			return this._setupDevices()
			.catch(e => {
				if (e) throw e // otherwise just swallow it
			})
		})
	}

	dispose (): Promise<void> {
		this._disposed = true
		if (this.iNewsWatcher) {
			return Promise.resolve(this.iNewsWatcher.dispose())
		} else {
			return Promise.resolve()
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
	private _setupDevices (): Promise<void> {
		if (this._disposed) return Promise.resolve()
		if (!this._settings) return Promise.resolve()
		if (!this._settings.hosts) return Promise.reject('No hosts available')
		if (!this._settings.queues) return Promise.reject('No queues set')
		this.iNewsConnection = inews({
			'hosts': this._settings.hosts.map(host => host.host),
			'user': this._settings.user,
			'password': this._settings.password
		})

		if (!this.iNewsWatcher) {
			let peripheralDevice = this.getThisPeripheralDevice()
			if (peripheralDevice) {
				this._coreHandler.setStatus(P.StatusCode.UNKNOWN, ['Initializing..'])
				this.iNewsWatcher = new RunningOrderWatcher(this._logger, this.iNewsConnection, this._settings.queues, 'v0.2', this.ingestDataToRunningOrders('v0.2'))

				this.updateChanges(this.iNewsWatcher)

				this._settings.queues.map((q) => {
					this._logger.info(`Starting watch of `, q.queue)
				})

				/**
				 * Get list of all rundowns and report good status.
				 */
				this.iNewsWatcher.checkINewsRundowns()
				.then((queueList) => {
					console.log('DUMMY LOG : ', queueList)
					if (this._settings) this._coreHandler.setStatus(P.StatusCode.GOOD, [`Watching iNews Queues`])
				})
				.catch(e => {
					console.log('Error in iNews Rundown list', e)
				})
			}
		}
		return Promise.resolve()
	}

	/**
	 *  Get the current rundown state from Core and convert it to runningOrders
	 */
	ingestDataToRunningOrders (gatewayVersion: string): { [runningOrderId: string]: InewsRundown } {
		// let coreRundowns = this._coreHandler.GetRundownList()
		let coreCache = this._coreHandler.GetRundownCache()
		let rundowns = coreCache.filter(item => item.type === 'rundown')
		let runningOrdersCache: { [runningOrderId: string]: InewsRundown } = {}

		rundowns.forEach((rundownHeader: any) => {
			let segments = [new RundownSegment('','','0','',0,'',false)]
			let rundown = new InewsRundown(
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
			runningOrdersCache[rundownHeader.data.externalId] = rundown
		})
		return runningOrdersCache
	}

	updateChanges (iNewsWatcher: RunningOrderWatcher) {
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
		// TODO - these event types should operate on the correct types and with better parameters
		.on('rundown_delete', (rundownExternalId) => {
			this._coreHandler.core.callMethod(P.methods.dataRundownDelete, [rundownExternalId]).catch(this._logger.error)
		})
		.on('rundown_create', (_rundownExternalId, rundown) => {
			this._coreHandler.core.callMethod(P.methods.dataRundownCreate, [mutateRundown(rundown)]).catch(this._logger.error)
		})
		.on('rundown_update', (_rundownExternalId, rundown) => {
			this._coreHandler.core.callMethod(P.methods.dataRundownUpdate, [mutateRundown(rundown)]).catch(this._logger.error)
		})
		.on('segment_delete', (rundownExternalId, sectionId) => {
			this._coreHandler.core.callMethod(P.methods.dataSegmentDelete, [rundownExternalId, sectionId]).catch(this._logger.error)
		})
		.on('segment_create', (rundownExternalId, _sectionId, newSection) => {
			this._coreHandler.core.callMethod(P.methods.dataSegmentCreate, [rundownExternalId, mutateSegment(newSection)]).catch(this._logger.error)
		})
		.on('segment_update', (rundownExternalId, _sectionId, newSection) => {
			this._coreHandler.core.callMethod(P.methods.dataSegmentUpdate, [rundownExternalId, mutateSegment(newSection)]).catch(this._logger.error)
		})
	}
}
