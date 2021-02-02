import { Connector, Config } from './connector'
import * as _ from 'underscore'
import yargs = require('yargs/yargs')
import { logger, SetLogLevel, SetupLogger } from './logger'

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
let certs: string[] = process.env.CERTIFICATES ? process.env.CERTIFICATES.split(';').filter((c) => c && c.length) : []
if (!certs.length) {
	certs = argv.certificates ?? []
}
let debug: boolean = argv.debug

SetupLogger()
SetLogLevel(debug ? 'debug' : 'info')

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

let c = new Connector(logger, config, debug)

logger.info(`Core: ${config.core.host}:${config.core.port}`)
logger.info('-----------------------------------')
c.init().catch(logger.error)
