import * as Winston from 'winston'

const transports: { console?: typeof Winston.transports.Console; file?: typeof Winston.transports.File } = {}

const DEFAULT_LEVEL = 'debug'

export let logger = new Winston.Logger({})

export function SetupLogger(logPath?: string) {
	const loggerTransports: Winston.TransportInstance[] = []
	if (logPath) {
		// Log json to file, human-readable to console
		console.log('Logging to', logPath)

		transports.file = new Winston.transports.File({
			level: DEFAULT_LEVEL,
			handleExceptions: true,
			json: true,
			stringify: (obj: any) => {
				return JSON.stringify(obj, JSONStringifyCircular())
			},
			filename: logPath,
		})
		loggerTransports.push(transports.file)
	}

	transports.console = new Winston.transports.Console({ level: DEFAULT_LEVEL, handleExceptions: true, json: false })
	loggerTransports.push(transports.console)

	logger = new Winston.Logger({ transports: loggerTransports })

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
}

export function SetLogLevel(level: 'debug' | 'info') {
	if (transports.console) {
		transports.console.level = level
	}

	if (transports.file) {
		transports.file.level = level
	}
}

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
