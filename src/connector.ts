
import { InewsFTPHandler, INewsDeviceSettings } from './inewsHandler'
import { CoreHandler, CoreConfig } from './coreHandler'
import * as Winston from 'winston'
import * as _ from 'underscore'
import { Process } from './process'
import { Observer } from 'tv-automation-server-core-integration'

export interface Config {
	process: ProcessConfig
	device: DeviceConfig
	core: CoreConfig
}
export interface ProcessConfig {
	/** Will cause the Node applocation to blindly accept all certificates. Not recommenced unless in local, controlled networks. */
	unsafeSSL: boolean
	/** Paths to certificates to load, for SSL-connections */
	certificates: string[]
}
export interface DeviceConfig {
	deviceId: string
	deviceToken: string
}
export class Connector {

	private iNewsFTPHandler: InewsFTPHandler
	private _observers: Array<Observer> = []
	private coreHandler: CoreHandler
	private _config: Config
	private _logger: Winston.LoggerInstance
	private _process: Process
	private _settings?: INewsDeviceSettings

	constructor (logger: Winston.LoggerInstance, config: Config) {
		this._logger = logger
		this._config = config
		this._process = new Process(this._logger)
		this.coreHandler = new CoreHandler(this._logger, this._config.device)
		this.iNewsFTPHandler = new InewsFTPHandler(this._logger, this.coreHandler)
		this.coreHandler.iNewsHandler = this.iNewsFTPHandler
	}

	// REFCATOR async/await
	init (): Promise<void> {
		return Promise.resolve()
		.then(() => {
			this._logger.info('Initializing Process...')
			return this.initProcess()
		})
		.then(() => {
			this._logger.info('Process initialized')
			this._logger.info('Initializing Core...')
			return this.initCore()
		})

		.then(() => {
			// REFACTOR - this is not async
			this.setupObserver()
			this._logger.info('Initialization of FTP-monitor done')
			return
		})
		.catch((e) => {
			this._logger.error('Error during initialization:', e, e.stack) // REFACTOR -
			// this._logger.error(e)
			// this._logger.error(e.stack)

			this._logger.info('Shutting down in 10 seconds!')

			try { // REFACTOR try in catch with catch
				this.dispose()
				.catch(e => this._logger.error(e))
			} catch (e) {
				this._logger.error(e)
			}

			// REFACTOR - why wait? and why not configurable?
			setTimeout(() => {
				process.exit(0)
			}, 10 * 1000)

			return
		})
	}
	// REFACTOR not a promise
	initProcess () {
		return this._process.init(this._config.process)
	}
	//  REFACTOR - return type and promise - awync/awat
	initCore () {
		return this.coreHandler.init(this._config.device, this._config.core, this._process)
	}
	// REFACTOR async/await
	initInewsFTPHandler (): Promise<void> {
		return this.iNewsFTPHandler.init(this.coreHandler).then(() => {
			this.coreHandler.iNewsHandler = this.iNewsFTPHandler
		}).catch((err) => {
			if (err) throw err
		})
	}
	// REFACTOR async/await
	dispose (): Promise<void> {
		return (
			this.iNewsFTPHandler ?
			this.iNewsFTPHandler.dispose()
			: Promise.resolve()
		)
		.then(() => {
			return (
				this.coreHandler ?
				this.coreHandler.dispose()
				: Promise.resolve()
			)
		})
		.then(() => { // NOP
			return
		})
	}
	setupObserver () {
		// Setup observer.
		let observer = this.coreHandler.core.observe('peripheralDevices')
		this._observers.push(observer)

		// REFACTOR - hidden async work - core does not expect this to be async
		let addedChanged = (id: string) => {
			// Check that collection exists.
			let devices = this.coreHandler.core.getCollection('peripheralDevices')
			if (!devices) throw Error('"peripheralDevices" collection not found!')

			// Find studio ID.
			let dev = devices.findOne({ _id: id })

			if (dev) {
				let settings: INewsDeviceSettings = dev.settings || {}
				settings.queues = settings.queues.filter(q => q.queue !== '')
				if (!this._settings || !_.isEqual(settings, this._settings)) {
					this.iNewsFTPHandler.dispose()
					.then(() => {
						this.iNewsFTPHandler = new InewsFTPHandler(this._logger, this.coreHandler)
						this.initInewsFTPHandler()
						.catch((error) => this._logger.error(error))
					})
					.catch((error) => {
						this._logger.error(error)
						throw new Error('Failed to update iNewsFTP settings')
					})
				}
				this._settings = settings
			}
		}

		observer.added = (id: string) => {
			addedChanged(id)
		}
		observer.changed = (id: string) => {
			addedChanged(id)
		}

		addedChanged(this.coreHandler.core.deviceId)
	}
}
