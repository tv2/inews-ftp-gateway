import { createDefaultLogger, Level } from '@tv2media/logger'

export let logger = createDefaultLogger()

export function setupLogger() {
	// Hijack console.log:
	// @ts-ignore
	if (!process.env.DEV) {
		let orgConsoleLog = console.log
		console.log = function (...args: any[]) {
			if (args.length >= 1) {
				try {
					// @ts-ignore one or more arguments
					logger.debug(args)
				} catch (e) {
					orgConsoleLog('CATCH')
					orgConsoleLog(...args)
					throw e
				}
			}
		}
	}
}

export function setLogLevel(level: keyof typeof Level) {
	logger.setLevel(Level[level])
}

export function ensureLogLevel(level?: string): keyof typeof Level | undefined {
	return Object.keys(Level).find((l) => l === level) as keyof typeof Level | undefined
}
