import { LoggerInstance } from 'winston'
import { readFile } from 'fs'
import { promisify } from 'util'
import { ProcessConfig } from './connector'

const readFilePromise = promisify(readFile)

export class Process {
	logger: LoggerInstance

	public certificates: Buffer[] = []

	constructor (logger: LoggerInstance) {
		this.logger = logger
	}

	async init (processConfig: ProcessConfig): Promise<void> {

		if (processConfig.unsafeSSL) {
			this.logger.info('Disabling NODE_TLS_REJECT_UNAUTHORIZED, be sure to ONLY DO THIS ON A LOCAL NETWORK!')
			process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'
		} else {
			// var rootCas = SSLRootCAs.create()
		}
		if (processConfig.certificates.length) {
			this.logger.info(`Loading certificates...`)
			this.certificates = await Promise.all(processConfig.certificates.map(async (certificate) => {
				try {
					let certData = await readFilePromise(certificate)
					this.logger.info(`Using certificate "${certificate}"`)
					return certData
				} catch (error) {
					this.logger.error(`Error loading certificate "${certificate}"`, error)
					return Buffer.alloc(0)
				}
			}))
			this.certificates = this.certificates.filter(b => b.length > 0)
		}
	}
}
