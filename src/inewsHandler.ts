import * as _ from 'underscore'
import * as Winston from 'winston'
import {
	CollectionObj,
	PeripheralDeviceAPI as P
} from 'tv-automation-server-core-integration'
import { CoreHandler } from './coreHandler'
import { RunningOrderWatcher } from './classes/RunningOrderWatcher'
import { mutatePart, mutateRundown, mutateSegment } from './mutate'
import * as DEFAULTS from './DEFAULTS'
import * as inews from '@johnsand/inews'

export interface InewsFTPConfig {
	userName: string
	passWord: string
}

export class InewsFTPHandler {

	public options: InewsFTPConfig
	public iNewsConnection: any
	public userName: string
	public passWord: string
	public debugLogging: boolean = false

	private iNewsWatcher?: RunningOrderWatcher

	private _logger: Winston.LoggerInstance
	private _disposed: boolean = false
	private _settings?: InewsFTPConfig
	private _coreHandler: CoreHandler

	constructor (logger: Winston.LoggerInstance, config: InewsFTPConfig, coreHandler: CoreHandler) {
		this._logger = logger
		this.options = config
		this._coreHandler = coreHandler
	}

	init (coreHandler: CoreHandler): Promise<void> {
		return coreHandler.core.getPeripheralDevice()
		.then((peripheralDevice: any) => {
			this._settings = peripheralDevice.settings || {}
			// ToDo: Use settings from core:

			console.log('DUMMY LOG : ', this._settings)
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

	private getThisPeripheralDevice (): CollectionObj | undefined {
		let peripheralDevices = this._coreHandler.core.getCollection('peripheralDevices')
		return peripheralDevices.findOne(this._coreHandler.core.deviceId)
	}

	private _setupDevices (): Promise<void> {
		if (this._disposed) return Promise.resolve()
		this.iNewsConnection = inews({
			'hosts': DEFAULTS.SERVERS,
			'user': this.options.userName,
			'password': this.options.passWord
		})

		if (!this.iNewsWatcher) {
			let peripheralDevice = this.getThisPeripheralDevice()
			if (peripheralDevice) {
				this._coreHandler.setStatus(P.StatusCode.UNKNOWN, ['Initializing..'])
				this.iNewsWatcher = new RunningOrderWatcher(this._logger, this._coreHandler, this.iNewsConnection, 'v0.2')

				this.updateChanges(this.iNewsWatcher)

				DEFAULTS.INEWS_QUEUE.map((q) => {
					this._logger.info(`Starting watch of `, q)
				})

				this.iNewsWatcher.checkINewsRundowns()
					.then((queueList) => {
						console.log('DUMMY LOG : ', queueList)
						this._coreHandler.setStatus(P.StatusCode.GOOD, [`Watching iNews Queue : '${DEFAULTS.INEWS_QUEUE[0]}'`])
					})
					.catch(e => {
						console.log('Error in iNews Rundown list', e)
					})
					// }
			}
		}
		return Promise.resolve()
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
		.on('part_delete', (rundownExternalId, sectionId, storyId) => {
			this._coreHandler.core.callMethod(P.methods.dataPartDelete, [rundownExternalId, sectionId, storyId]).catch(this._logger.error)
		})
		.on('part_create', (rundownExternalId, sectionId, _storyId, newStory) => {
			this._coreHandler.core.callMethod(P.methods.dataPartCreate, [rundownExternalId, sectionId, mutatePart(newStory)]).catch(this._logger.error)
		})
		.on('part_update', (rundownExternalId, sectionId, _storyId, newStory) => {
			this._coreHandler.core.callMethod(P.methods.dataPartUpdate, [rundownExternalId, sectionId, mutatePart(newStory)]).catch(this._logger.error)
		})

	}
}
