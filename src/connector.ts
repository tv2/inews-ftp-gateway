import { InewsFTPHandler, INewsDeviceSettings } from './inewsHandler'
import { CoreHandler, CoreConfig } from './coreHandler'
import * as _ from 'underscore'
import { Process } from './process'
import { Observer } from '@sofie-automation/server-core-integration'
import { ensureLogLevel, setLogLevel } from './logger'
import { ILogger as Logger } from '@tv2media/logger'
import { unprotectString } from '@sofie-automation/shared-lib/dist/lib/protectedString'
import * as  Koa from 'koa'
import * as KoaRouter from 'koa-router'

export interface Config {
	process: ProcessConfig
	device: DeviceConfig
	core: CoreConfig
}
export interface ProcessConfig {
	/** Will cause the Node application to blindly accept all certificates. Not recommenced unless in local, controlled networks. */
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
	private _logger: Logger
	private _process: Process
	private _settings?: INewsDeviceSettings
	private _debug: boolean
	private koaApp: Koa
	private koaRouter: KoaRouter


	constructor(logger: Logger, config: Config, debug: boolean) {
		this._logger = logger.tag(this.constructor.name)
		this._config = config
		this._debug = debug
		this._process = new Process(this._logger)
		this.coreHandler = new CoreHandler(this._logger, this._config.device)
		this.iNewsFTPHandler = new InewsFTPHandler(this._logger, this.coreHandler)
		this.coreHandler.iNewsHandler = this.iNewsFTPHandler
		this.koaApp = new Koa()
		this.koaRouter = new KoaRouter()
	}

	async init(): Promise<void> {
		try {
			this._logger.info('Initializing Process...')
			await this.initProcess()
			this._logger.info('Process initialized')
			this._logger.info('Initializing Core...')
			await this.initCore()
			this._logger.info('Core is initialized')
			this.setupObserver()
			this._logger.info('Initialization of FTP-monitor done')
			this.setupReloadDataKoaEndpoint()
		} catch (err) {
			this._logger.data(err).error(`Error during initialization:`)

			this._logger.info('Shutting down in 10 seconds!')
			this.dispose().catch((e) => this._logger.data(e).error('Error during dispose'))

			setTimeout(() => {
				process.exit(0)
			}, 10 * 1000)
		}
	}

	async initProcess(): Promise<void> {
		return this._process.init(this._config.process)
	}

	async initCore(): Promise<void> {
		await this.coreHandler.init(this._config.device, this._config.core, this._process)
	}

	async initInewsFTPHandler(): Promise<void> {
		await this.iNewsFTPHandler.init(this.coreHandler)
		this.coreHandler.iNewsHandler = this.iNewsFTPHandler
	}

	async dispose(): Promise<void> {
		if (this.iNewsFTPHandler) {
			await this.iNewsFTPHandler.dispose()
		}
		if (this.coreHandler) {
			await this.coreHandler.dispose()
		}
	}

	setupObserver() {
		// Setup observer.
		let observer = this.coreHandler.core.observe('peripheralDevices')
		this._observers.push(observer)

		let addedChanged = (id: string) => {
			// Check that collection exists.
			let devices = this.coreHandler.core.getCollection('peripheralDevices')
			if (!devices) throw Error('"peripheralDevices" collection not found!')

			// Find studio ID.
			let dev = devices.findOne({ _id: id })

			if (dev) {
				let settings: INewsDeviceSettings = dev.settings || {}
				settings.queues = settings.queues?.filter((q) => q.queues !== '')
				if (!this._settings || !_.isEqual(_.omit(settings, 'debug'), _.omit(this._settings, 'debug'))) {
					this.iNewsFTPHandler
						.dispose()
						.then(() => {
							this.iNewsFTPHandler = new InewsFTPHandler(this._logger, this.coreHandler)
							return this.initInewsFTPHandler()
						})
						.catch((error) => {
							this._logger.data(error).error('Failed to update iNewsFTP settings:')
							throw new Error('Failed to update iNewsFTP settings')
						})
				}

				if (settings.debug !== undefined && settings.debug !== this._debug) {
					this._debug = settings.debug
					const logLevel = this._debug ? 'debug' : ensureLogLevel(process.env.LOG_LEVEL) ?? 'warn'
					setLogLevel(logLevel)
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

		addedChanged(unprotectString(this.coreHandler.core.deviceId))
	}

	private setupReloadDataKoaEndpoint(): void {
		const KOA_PORT: number = 3007
		const RUNDOWN_EXTERNAL_ID_SUFFIX: string = '_1'

		this.koaRouter.post('/reloadData/:rundownName', async (context, next): Promise<void> => {
			if (!this.iNewsFTPHandler.iNewsWatcher) {
				context.status = 503
				context.response.body = 'Error: iNewsWatcher is undefined'
				return
			}
			try {
				await this.iNewsFTPHandler.iNewsWatcher.ResyncRundown(context.params.rundownName + RUNDOWN_EXTERNAL_ID_SUFFIX)
				await next()
			} catch (error) {
				context.status = 500
				context.response.body = 'Error: ' + error
			}
		})

		this.koaApp.use(this.koaRouter.routes()).use(this.koaRouter.allowedMethods())

		this.koaApp.listen(KOA_PORT, () => {})
	}
}
