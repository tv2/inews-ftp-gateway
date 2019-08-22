import * as _ from 'underscore'
import * as Winston from 'winston'
import {
	CollectionObj,
	PeripheralDeviceAPI as P
} from 'tv-automation-server-core-integration'

import { CoreHandler } from './coreHandler'
import { RunningOrderWatcher } from './classes/RunningOrderWatcher'
import { mutateRundown, mutateSegment, mutatePart } from './mutate'

export interface InewsFTPConfig {
	// Todo: add settings here?
	// self: IConnectionConfig
}
export interface InewsFTPDeviceSettings {
	/** Path / Name to the Drive folder */
	folderPath: string  /* iNews Queue */
	debugLogging: boolean

	/** Set to true when secret value exists */
	secretCredentials: boolean /* For now Ip address */
	secretAccessToken: boolean /* For now Password */
}

export interface InewsFTPDeviceSecretSettings {
	credentials?: Credentials /* For now Ip address */
	accessToken?: AccessToken /* For now Password */
}

export interface Credentials {
	installed: {
		client_id: string
		project_id: string
		auth_uri: string
		token_uri: string
		auth_provider_x509_cert_url: string
		client_secret: string
		redirect_uris: string[]
	}
}

export interface AccessToken {
	access_token: string
	refresh_token: string
	scope: string
	token_type: string
	expiry_date: number
}

export class InewsFTPHandler {

	public options: InewsFTPConfig
	public debugLogging: boolean = false

	private iNewsWatcher?: RunningOrderWatcher

	private _logger: Winston.LoggerInstance
	private _disposed: boolean = false
	private _settings?: InewsFTPDeviceSettings
	private _coreHandler: CoreHandler
	private _observers: Array<any> = []
	private _triggerupdateDevicesTimeout: any = null

	constructor (logger: Winston.LoggerInstance, config: InewsFTPConfig, coreHandler: CoreHandler) {
		this._logger = logger
		this.options = config
		this._coreHandler = coreHandler

		coreHandler.doReceiveAuthToken = (authToken: string) => {
			// A dummy for using spreadsheetconnection as FTP (until Core has ADDED this)
			console.log(authToken)
			return new Promise((resolve) => { resolve() })
		}
	}
	init (coreHandler: CoreHandler): Promise<void> {
		return coreHandler.core.getPeripheralDevice()
		.then((peripheralDevice: any) => {
			this._settings = peripheralDevice.settings || {}

			return this._initInewsFTPConnection()
		})
		.then(() => {
			this._coreHandler.onConnected(() => {
				this.setupObservers()
			})
			this.setupObservers()

			return this._updateDevices()
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
	setupObservers () {
		if (this._observers.length) {
			this._observers.forEach((obs) => {
				obs.stop()
			})
			this._observers = []
		}
		this._logger.info('Renewing observers')

		let deviceObserver = this._coreHandler.core.observe('peripheralDevices')
		deviceObserver.added = () => { this._deviceOptionsChanged() }
		deviceObserver.changed = () => { this._deviceOptionsChanged() }
		deviceObserver.removed = () => { this._deviceOptionsChanged() }
		this._observers.push(deviceObserver)

		this._deviceOptionsChanged()

	}
	debugLog (msg: any, ...args: any[]) {
		if (this.debugLogging) {
			this._logger.debug(msg, ...args)
		}
	}

	private _deviceOptionsChanged () {
		let peripheralDevice = this.getThisPeripheralDevice()
		if (peripheralDevice) {
			let settings: InewsFTPDeviceSettings = peripheralDevice.settings || {}
			if (this.debugLogging !== settings.debugLogging) {
				this._logger.info('Changing debugLogging to ' + settings.debugLogging)

				this.debugLogging = settings.debugLogging

				// this.iNewsWatcher.setDebug(settings.debugLogging)

				if (settings.debugLogging) {
					this._logger.level = 'debug'
				} else {
					this._logger.level = 'info'
				}
				this._logger.info('log level ' + this._logger.level)
				this._logger.info('test log info')
				console.log('test console.log')
				this._logger.debug('test log debug')
			}
		}
		if (this._triggerupdateDevicesTimeout) {
			clearTimeout(this._triggerupdateDevicesTimeout)
		}
		this._triggerupdateDevicesTimeout = setTimeout(() => {
			this._updateDevices()
			.catch(e => {
				if (e) this._logger.error(e)
			})
		}, 20)
	}
	private async _initInewsFTPConnection (): Promise<void> {
		if (this._disposed) return Promise.resolve()
		if (!this._settings) throw Error('iNews-Settings are not set')

		this._logger.info('Initializing iNews connection...')

	}
	private getThisPeripheralDevice (): CollectionObj | undefined {
		let peripheralDevices = this._coreHandler.core.getCollection('peripheralDevices')
		return peripheralDevices.findOne(this._coreHandler.core.deviceId)
	}
	private _updateDevices (): Promise<void> {
		if (this._disposed) return Promise.resolve()
		return (
			!this.iNewsWatcher ?
			this._initInewsFTPConnection() :
			Promise.resolve()
		)
		.then(async () => {
			let peripheralDevice = this.getThisPeripheralDevice()

			if (peripheralDevice) {
				let secretSettings: InewsFTPDeviceSecretSettings = peripheralDevice.secretSettings || {}

				this._coreHandler.setStatus(P.StatusCode.UNKNOWN, ['Initializing..'])

				// this._logger.info('GO!')

				if (this.iNewsWatcher) {
					this.iNewsWatcher.dispose()
					delete this.iNewsWatcher
				}

				const userName = String(secretSettings.credentials)
				const passWord = String(secretSettings.accessToken)

				const watcher = new RunningOrderWatcher(userName, passWord, this._coreHandler, 'v0.2')
				this.iNewsWatcher = watcher

				watcher
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
			return Promise.resolve()
		})
		.then(() => {
			return
		})
	}
}
