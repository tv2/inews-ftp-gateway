import * as _ from 'underscore'
import * as Winston from 'winston'
import {
	CollectionObj,
	PeripheralDeviceAPI as P
} from 'tv-automation-server-core-integration'
import { CoreHandler } from './coreHandler'
import { RunningOrderWatcher } from './classes/RunningOrderWatcher'
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

				// if (true) {
				DEFAULTS.INEWS_QUEUE.map((q) => {
					this._logger.info(`Starting watch of `, q)
				})

				this.iNewsWatcher.checkInewsRundowns()
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
}
