import { CoreConnection,
	CoreOptions,
	PeripheralDeviceAPI as P,
	DDPConnectorOptions,
  CollectionObj,
  Observer
} from 'tv-automation-server-core-integration'
import * as Winston from 'winston'
import * as fs from 'fs'
import { Process } from './process'

import * as _ from 'underscore'

import { DeviceConfig } from './connector'
import { InewsFTPHandler } from './inewsHandler'
import { mutateRundown } from './mutate'
// import { STATUS_CODES } from 'http'
export interface PeripheralDeviceCommand {
	_id: string

	deviceId: string
	functionName: string
	args: Array<any>

	hasReply: boolean
	reply?: any
	replyError?: any

	time: number // time
}
export interface CoreConfig {
	host: string,
	port: number,
	watchdog: boolean
}
/**
 * Represents a connection between mos-integration and Core
 */
export class CoreHandler {

	public core: CoreConnection

	private logger: Winston.LoggerInstance
	private _observers: Array<Observer> = []
	private _onConnected?: () => any
	private _subscriptions: Array<any> = []
	private _isInitialized: boolean = false
	private _executedFunctions: {[id: string]: boolean} = {}
	private _coreConfig?: CoreConfig
	private _process?: Process
	private _studioId?: string
	public iNewsHandler?: InewsFTPHandler

	constructor (logger: Winston.LoggerInstance, deviceOptions: DeviceConfig) {
		this.logger = logger
		this.core = new CoreConnection(this.getCoreConnectionOptions(deviceOptions, 'iNews Gateway'))
	}

	async init (_deviceOptions: DeviceConfig, config: CoreConfig, process: Process): Promise<void> {
		// this.logger.info('========')

		this._coreConfig = config
		this._process = process

		this.core.onConnected(() => {
			this.logger.info('Core Connected!')
			if (this._isInitialized) this.onConnectionRestored().catch(e => this.logger.error('onConnected error', e, e.stack))
		})
		this.core.onDisconnected(() => {
			this.logger.info('Core Disconnected!')
		})
		this.core.onError((err) => {
			this.logger.error('Core Error: ' + (err.message || err.toString() || err))
		})

		let ddpConfig: DDPConnectorOptions = {
			host: config.host,
			port: config.port
		}
		if (this._process && this._process.certificates.length) {
			ddpConfig.tlsOpts = {
				ca: this._process.certificates
			}
		}
		await this.core.init(ddpConfig)

		await this.setStatus(P.StatusCode.UNKNOWN, ['Starting up'])
		await this.setupSubscriptionsAndObservers()

		this._isInitialized = true
	}
	/**
	 * Destroy gateway
	 */
	async dispose (): Promise<void> {
		await this.core.setStatus({
			statusCode: P.StatusCode.FATAL,
			messages: ['Shutting down']
		})
		await this.core.destroy()
	}
	/**
	 * Report gateway status to core
	 */
	async setStatus (statusCode: P.StatusCode, messages: string[]): Promise<P.StatusObject> {
		try {
			return this.core.setStatus({
				statusCode: statusCode,
				messages: messages
			})
		} catch (e) {
			this.logger.warn(`Error when setting status: + ${e}`)
			return {
				statusCode: P.StatusCode.WARNING_MAJOR,
				messages: [ 'Error when setting status', e ]
			}
		}
	}
	/**
	 * Get options for connecting to core
	 */
	getCoreConnectionOptions (deviceOptions: DeviceConfig, name: string): CoreOptions {
		let credentials: {
			deviceId: string
			deviceToken: string
		}

		if (deviceOptions.deviceId && deviceOptions.deviceToken) {
			credentials = {
				deviceId: deviceOptions.deviceId,
				deviceToken: deviceOptions.deviceToken
			}
		} else if (deviceOptions.deviceId) {
			this.logger.warn('Token not set, only id! This might be unsecure!')
			credentials = {
				deviceId: deviceOptions.deviceId + name,
				deviceToken: 'unsecureToken'
			}
		} else {
			credentials = CoreConnection.getCredentials(name.replace(/ /g,''))
		}
		let options: CoreOptions = {
			...credentials,

			deviceCategory: P.DeviceCategory.INGEST,
			deviceType: P.DeviceType.INEWS,
			deviceSubType: P.SUBTYPE_PROCESS,

			deviceName: name,
			watchDog: (this._coreConfig ? this._coreConfig.watchdog : true)
		}
		options.versions = this._getVersions()
		return options
	}
	/**
	 * Called when reconnected to core
	 */
	async onConnectionRestored () {
		// The following command was placed after subscription setup but being
		// executed before it.
		if (this._onConnected) this._onConnected()
		await this.setupSubscriptionsAndObservers()
		.catch((e) => {
			this.logger.error('setupSubscriptionsAndObservers error', e, e.stack)
		})
	}
	/**
	 * Called when connected to core.
	 */
	onConnected (fcn: () => any) {
		this._onConnected = fcn
	}
	/**
	 * Subscribes to events in the core.
	 */
	async setupSubscriptionsAndObservers (): Promise<void> {
		if (this._observers.length) {
			this.logger.info('Core: Clearing observers..')
			this._observers.forEach((obs: Observer) => {
				obs.stop()
			})
			this._observers = []
		}
		this._subscriptions = []

		this.logger.info('Core: Setting up subscriptions for ' + this.core.deviceId + '..')
		let subs = await Promise.all([
			this.core.autoSubscribe('peripheralDevices', {
				_id: this.core.deviceId
			}),
			this.core.autoSubscribe('peripheralDeviceCommands', this.core.deviceId),
			this.core.autoSubscribe('peripheralDevices', this.core.deviceId),
			this.core.autoSubscribe('ingestDataCache', {}),
			this.core.autoSubscribe('rundowns', {})
		])
		this._subscriptions = this._subscriptions.concat(subs)
		this.setupObserverForPeripheralDeviceCommands() // Sets up observers
		this.executePeripheralDeviceCommands()
		  .catch(e => this.logger.error(`executePeripheralDeviceCommands error`, e, e.stack)) // Runs any commands async
		this.setupObserverForPeripheralDevices()
	}
	/**
	 * Executes a peripheral device command.
	 */
	async executeFunction (cmd: PeripheralDeviceCommand): Promise<void> {
		if (cmd) {
			if (this._executedFunctions[cmd._id]) return // prevent it from running multiple times
			this.logger.debug(cmd.functionName, cmd.args)
			this._executedFunctions[cmd._id] = true
			let success = false

			try {
				switch (cmd.functionName) {
					case 'triggerReloadRundown':
						const reloadRundownResult = await Promise.resolve(this.triggerReloadRundown(cmd.args[0]))
						success = true
						await this.core.callMethod(P.methods.functionReply, [cmd._id, null, reloadRundownResult])
						break
					case 'triggerReloadSegment':
						const reloadSegmentResult = await Promise.resolve(this.triggerReloadRundown(cmd.args[0]))
						success = true
						await this.core.callMethod(P.methods.functionReply, [cmd._id, null, reloadSegmentResult])
						break
					case 'pingResponse':
						let pingResponseResult = await Promise.resolve(this.pingResponse(cmd.args[0]))
						success = true
						await this.core.callMethod(P.methods.functionReply, [cmd._id, null, pingResponseResult])
						break
					case 'retireExecuteFunction':
						let retireExecuteFunctionResult = await Promise.resolve(this.retireExecuteFunction(cmd.args[0]))
						success = true
						await this.core.callMethod(P.methods.functionReply, [cmd._id, null, retireExecuteFunctionResult])
						break
					case 'killProcess':
						let killProcessFunctionResult = await Promise.resolve(this.killProcess(cmd.args[0]))
						success = true
						await this.core.callMethod(P.methods.functionReply, [cmd._id, null, killProcessFunctionResult])
						break
					case 'getSnapshot':
						let getSnapshotResult = await Promise.resolve(this.getSnapshot())
						success = true
						await this.core.callMethod(P.methods.functionReply, [cmd._id, null, getSnapshotResult])
						break
					default:
						throw Error('Function "' + cmd.functionName + '" not found!')
				}
			} catch (err) {
				this.logger.error(`executeFunction error ${success ? 'during execution' : 'on reply'}`, err, err.stack)
				if (!success) {
					await this.core.callMethod(P.methods.functionReply, [cmd._id, err.toString(), null])
					  .catch(e => this.logger.error('executeFunction reply error after execution failure', e, e.stack))
				}
			}
		}
	}

	retireExecuteFunction (cmdId: string) {
		delete this._executedFunctions[cmdId]
	}

	/**
	 * Listen for commands.
	 */
	// Made async as it does async work ...
	setupObserverForPeripheralDeviceCommands () {
		let observer = this.core.observe('peripheralDeviceCommands')
		this.killProcess(0) // just make sure it exists
		this._observers.push(observer)

		/**
		 * Called when a command is added/changed. Executes that command.
		 * @param {string} id Command id to execute.
		 */
		// Note: Oberver is not expecting a promise.
		let addedChangedCommand = (id: string): void => {
			let cmds = this.core.getCollection('peripheralDeviceCommands')
			if (!cmds) throw Error('"peripheralDeviceCommands" collection not found!')
			let cmd = cmds.findOne(id) as PeripheralDeviceCommand
			if (!cmd) throw Error('PeripheralCommand "' + id + '" not found!')
			if (cmd.deviceId === this.core.deviceId) {
				this.executeFunction(cmd).catch(e => this.logger.error('Error executing command recieved from core', e, e.stack))
			}
			return
		}
		observer.added = (id: string) => {
			addedChangedCommand(id)
		}
		observer.changed = (id: string) => {
			addedChangedCommand(id)
		}
		observer.removed = (id: string) => {
			this.retireExecuteFunction(id)
		}
	}

	/**
	 *  Execute all relevant commands now
	 */
	async executePeripheralDeviceCommands (): Promise<void> {
		let cmds = this.core.getCollection('peripheralDeviceCommands')
		if (!cmds) throw Error('"peripheralDeviceCommands" collection not found!')
		await Promise.all(cmds.find({}).map((cmd0) => {
			let cmd = cmd0 as PeripheralDeviceCommand
			if (cmd.deviceId === this.core.deviceId) {
				return this.executeFunction(cmd)
			}
			return
		}))
	}

	/**
	 * Subscribes to changes to the device to get its associated studio ID.
	 */
	setupObserverForPeripheralDevices () {
		// Setup observer.
		let observer = this.core.observe('peripheralDevices')
		this.killProcess(0)
		this._observers.push(observer)

		let addedChanged = (id: string) => {
			// Check that collection exists.
			let devices = this.core.getCollection('peripheralDevices')
			if (!devices) throw Error('"peripheralDevices" collection not found!')

			// Find studio ID.
			let dev = devices.findOne({ _id: id })
			if ('studioId' in dev) {
				if (dev['studioId'] !== this._studioId) {
					this._studioId = dev['studioId']
				}
			} else {
				throw Error('Could not get a studio for iNews-gateway')
			}
		}

		observer.added = (id: string) => {
			addedChanged(id)
		}
		observer.changed = (id: string) => {
			addedChanged(id)
		}

		addedChanged(this.core.deviceId)
	}
	/**
	 * Kills the gateway.
	 * @param actually Whether to actually kill the gateway, or just test this function.
	 */
	killProcess (actually: number) {
		if (actually === 1) {
			this.logger.info('KillProcess command received, shutting down in 1000ms!')
			setTimeout(() => {
				process.exit(0)
			}, 1000)
			return true
		}
		return 0
	}
	/**
	 * Respond to ping from core.
	 * @param message Response.
	 */
	pingResponse (message: string) {
		this.core.setPingResponse(message)
		return true
	}
	/** Get snapshot of the gateway. */
	getSnapshot (): any {
		this.logger.info('getSnapshot')
		if (this.iNewsHandler?.iNewsWatcher?.rundowns) {
			const ret: any = {}
			Object.keys(this.iNewsHandler.iNewsWatcher.rundowns).forEach(key => {
				const rundown = this.iNewsHandler?.iNewsWatcher?.rundowns[key]
				if (rundown) {
					ret[key] = mutateRundown(rundown)
				}
			})
			return ret
		}

		return {}
	}
	/** Reload a rundown */
	async triggerReloadRundown (rundownId: string): Promise<null> {

		// FIXME: INSTEAD OF RETRIGGERING WE SHOULD RE-INITIALISE runnigOrders[roId]
		// If empty it should automatically reload in the setInterval timer.

		// PROMISE should be removed - only here so we do not change the Core
		// A return statement or errorhandling?
		// IT WILL ALSO GIVE A WRONG MESSAGE IN THE GUI RIGHT NOW
		console.log('DUMMMY - roId :', rundownId)
		if (this.iNewsHandler && this.iNewsHandler.iNewsWatcher) {
			// this.iNewsHandler.iNewsWatcher.rundownManager.downloadINewsRundown(rundownId)
			delete this.iNewsHandler.iNewsWatcher.rundowns[rundownId]
		}
		return null
	}

	async triggerReloadSegment (_rundownId: string, _segmentId: string): Promise<string> {
		return Promise.reject('not implemented')
	}

	/**
	 * Get the versions of installed packages.
	 */
	// Allowing sync methods here as only called during initialization
	private _getVersions () {
		let versions: {[packageName: string]: string} = {}

		if (process.env.npm_package_version) {
			versions['_process'] = process.env.npm_package_version
		}

		let dirNames = [
			'tv-automation-server-core-integration'
		]
		try {
			let nodeModulesDirectories = fs.readdirSync('node_modules')
			_.each(nodeModulesDirectories, (dir) => {
				try {
					if (dirNames.indexOf(dir) !== -1) {
						let file = 'node_modules/' + dir + '/package.json'
						file = fs.readFileSync(file, 'utf8')
						let json = JSON.parse(file)
						versions[dir] = json.version || 'N/A'
					}
				} catch (e) {
					this.logger.error(e)
				}
			})
		} catch (e) {
			this.logger.error(e)
		}
		return versions
	}

	/**
	 * Returns the ID of the currently active rundown.
	 */
	public GetLiveRundown (): string | undefined {
		let rundowns = this.core.getCollection('rundowns')
		if (!rundowns) throw Error('"rundowns" collection not found!')

		let activeRundown = rundowns.findOne({ studioId: this._studioId, active: true })
		return activeRundown.externalId
	}

	/**
	 * Returns Sofie rundown orders state
	 */
	public GetRundownCache (): Array<CollectionObj> {
		let rundowns = this.core.getCollection('ingestDataCache')
		if (!rundowns) throw Error('"ingestDataCache" collection not found!')

		let fullIngestCache = rundowns.find({})
		return fullIngestCache
	}

	/**
	 * Checks if a rundown is active.
	 * @param externalId External ID of the active rundown.
	 */
	public IsRundownLive (externalId: string): boolean {
		let rundowns = this.core.getCollection('rundowns')
		if (!rundowns) throw Error('"rundowns" collection not found!')

		let rundown = rundowns.findOne({ studioId: this._studioId, externalId: externalId })
		return rundown.active
	}
}
