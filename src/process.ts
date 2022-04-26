import { ILogger as Logger } from '@tv2media/logger'
import { readFile } from 'fs'
import { promisify } from 'util'
import { ProcessConfig } from './connector'

const readFilePromise = promisify(readFile)

export class Process {
	logger: Logger

	public certificates: Buffer[] = []

	constructor(logger: Logger) {
		this.logger = logger.tag('Process')
	}

	async init(processConfig: ProcessConfig): Promise<void> {
		if (processConfig.unsafeSSL) {
			this.logger.info('Disabling NODE_TLS_REJECT_UNAUTHORIZED, be sure to ONLY DO THIS ON A LOCAL NETWORK!')
			process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'
		} else {
			// var rootCas = SSLRootCAs.create()
		}
		if (processConfig.certificates.length) {
			this.logger.info(`Loading certificates...`)
			this.certificates = await Promise.all(
				processConfig.certificates.map(async (certificate) => {
					try {
						let certData = await readFilePromise(certificate)
						this.logger.info(`Using certificate "${certificate}"`)
						return certData
					} catch (error) {
						this.logger.data(error).error(`Error loading certificate "${certificate}"`)
						return Buffer.alloc(0)
					}
				})
			)
			this.certificates = this.certificates.filter((b) => b.length > 0)
		}
	}
}
