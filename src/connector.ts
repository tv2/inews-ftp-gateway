
import { InewsFTPHandler, InewsFTPConfig } from './inewsHandler'
import { CoreHandler, CoreConfig } from './coreHandler'
import * as Winston from 'winston'
import { Process } from './process'


export interface Config {
	process: ProcessConfig
	device: DeviceConfig
	core: CoreConfig
	ftpLogin: InewsFTPConfig
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
	private coreHandler: CoreHandler
	private _config: Config
	private _logger: Winston.LoggerInstance
	private _process: Process

	constructor (logger: Winston.LoggerInstance, config: Config) {
		this._logger = logger
		this._config = config
		this._process = new Process(this._logger)
		this.coreHandler = new CoreHandler(this._logger, this._config.device)
		this.iNewsFTPHandler = new InewsFTPHandler(this._logger, this._config.ftpLogin, this.coreHandler)
	}

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
			this._logger.info('Initializing iNews-FTP-monitor...')
			return this.initInewsFTPHandler()
		})
		.then(() => {
			this._logger.info('Initialization done')
			return
		})
		.catch((e) => {
			this._logger.error('Error during initialization:', e, e.stack)
			// this._logger.error(e)
			// this._logger.error(e.stack)

			this._logger.info('Shutting down in 10 seconds!')

			try {
				this.dispose()
				.catch(e => this._logger.error(e))
			} catch (e) {
				this._logger.error(e)
			}

			setTimeout(() => {
				process.exit(0)
			}, 10 * 1000)

			return
		})
	}
	initProcess () {
		return this._process.init(this._config.process)
	}
	initCore () {
		return this.coreHandler.init(this._config.device, this._config.core, this._process)
	}
	initInewsFTPHandler (): Promise<void> {
		return this.iNewsFTPHandler.init(this.coreHandler)

	}
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
		.then(() => {
			return
		})
	}
}
