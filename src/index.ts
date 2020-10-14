import { Connector, Config } from './connector'
import * as Winston from 'winston'
import * as _ from 'underscore'
import yargs = require('yargs/yargs')

const argv = yargs(process.argv.slice(2))
	.options({
		host: { type: 'string', default: '127.0.0.1', describe: 'Host of core' },
		port: { type: 'number', default: 3000, describe: 'Port of core' },
		log: { type: 'string', required: false, describe: 'File path to output logs to' },
		id: { type: 'string', required: false, describe: 'Set device Id' },
		token: { type: 'string', required: false, describe: 'Token for core communication' },
		debug: { type: 'boolean', default: false, describe: 'Debug mode' },
		certificates: { type: 'array', string: true, required: false, describe: 'Provide paths to SSL certificates' },
		disableWatchdog: {
			type: 'boolean',
			default: false,
			describe: 'Disable the watchdog (Killing the process if no commands are received after some time)',
		},
		unsafeSSL: {
			type: 'boolean',
			default: false,
			describe: 'Accept all certificates. Not recommended outside of development environments.',
		},
	})
	.help('help').argv

// CLI arguments / Environment variables
let host: string = process.env.CORE_HOST ?? argv.host
let port: number = parseInt(process.env.CORE_PORT + '', 10) || argv.port
let logPath: string = process.env.CORE_LOG ?? argv.log ?? ''
let deviceId: string = process.env.DEVICE_ID ?? argv.id ?? ''
let deviceToken: string = process.env.DEVICE_TOKEN ?? argv.token ?? ''
let disableWatchdog: boolean = process.env.DISABLE_WATCHDOG === '1' || argv.disableWatchdog
let unsafeSSL: boolean = process.env.UNSAFE_SSL === '1' || argv.unsafeSSL
let certs: string[] = (process.env.CERTIFICATES ?? '').split(';') || (argv.certificates ?? [])
let debug: boolean = argv.debug

/**
 * Used when JSON.stringifying values that might be circular
 * Usage: JSON.stringify(value, JSONStringifyCircular()))
 */
let JSONStringifyCircular = () => {
	let cacheValues: any[] = []
	let cacheKeys: any[] = []
	let stringifyFixer = (key: string, value: any) => {
		if (typeof value === 'object' && value !== null) {
			let i = cacheValues.indexOf(value)
			if (i !== -1) {
				// Duplicate reference found
				try {
					// If this value does not reference a parent it can be deduped
					return JSON.parse(JSON.stringify(value))
				} catch (error) {
					// discard key if value cannot be deduped
					return '[circular of ' + (cacheKeys[i] || '*root*') + ']'
				}
			}
			// Store value in our collection
			cacheValues.push(value)
			cacheKeys.push(key)
		}
		return value
	}
	return stringifyFixer
}
// Setup logging
let logger = new Winston.Logger({})

if (logPath) {
	// Log json to file, human-readable to console
	console.log('Logging to', logPath)
	logger.add(Winston.transports.Console, {
		level: 'verbose',
		handleExceptions: true,
		json: false,
	})
	logger.add(Winston.transports.File, {
		level: 'debug',
		handleExceptions: true,
		json: true,
		stringify: (obj: any) => {
			return JSON.stringify(obj, JSONStringifyCircular())
		},
		filename: logPath,
	})
	// Hijack console.log:
	// @ts-ignore
	if (!process.env.DEV) {
		let orgConsoleLog = console.log
		console.log = function (...args: any[]) {
			// orgConsoleLog('a')
			if (args.length >= 1) {
				try {
					// @ts-ignore one or more arguments
					logger.debug(...args)
					// logger.debug(...args.map(JSONStringifyCircular()))
				} catch (e) {
					orgConsoleLog('CATCH')
					orgConsoleLog(...args)
					throw e
				}
				orgConsoleLog(...args)
			}
		}
	}
} else {
	console.log('Logging to Console')
	// Log json to console
	logger.add(Winston.transports.Console, {
		// level: 'verbose',
		handleExceptions: true,
		json: true,
		stringify: (obj: any) => {
			return JSON.stringify(obj, JSONStringifyCircular()) // make single line
		},
	})
	// Hijack console.log:
	// @ts-ignore
	if (!process.env.DEV) {
		console.log = function (...args: any[]) {
			if (args.length >= 1) {
				// @ts-ignore one or more arguments
				logger.debug(...args)
			}
		}
	}
}

// Because the default NodeJS-handler sucks and wont display error properly
process.on('unhandledRejection', (e: any) => {
	logger.error('Unhandled Promise rejection:', e, e.reason || e.message, e.stack)
})
process.on('warning', (e: any) => {
	logger.warn('Unhandled warning:', e, e.reason || e.message, e.stack)
})

logger.info('-----------------------------------')
logger.info('Statup options:')

logger.info(`host: "${host}"`)
logger.info(`port: ${port}`)
logger.info(`log: "${logPath}"`)
logger.info(`id: "${deviceId}"`)
logger.info(`token: "${deviceToken}"`)
logger.info(`debug: ${debug}`)
logger.info(`certificates: [${certs.join(',')}]`)
logger.info(`disableWatchdog: ${disableWatchdog}`)
logger.info(`unsafeSSL: ${unsafeSSL}`)

logger.info('-----------------------------------')

// App config
let config: Config = {
	process: {
		unsafeSSL: unsafeSSL,
		certificates: certs,
	},
	device: {
		deviceId: deviceId,
		deviceToken: deviceToken,
	},
	core: {
		host: host,
		port: port,
		watchdog: !disableWatchdog,
	},
}

let c = new Connector(logger, config)

logger.info(`Core: ${config.core.host}:${config.core.port}`)
logger.info('-----------------------------------')
c.init().catch(logger.error)
