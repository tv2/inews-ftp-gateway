import { InewsRundown } from './datastructures/Rundown'
import * as Winston from 'winston'
import { ParsedElementsIntoSegments } from './ParsedElementsToSegments'

export class RundownManager {

	private _logger: Winston.LoggerInstance

	constructor (private logger: Winston.LoggerInstance, private inewsConnection: any) {
		this._logger = this.logger
		this.inewsConnection = inewsConnection
	}

	downloadRunningOrder (rundownSheetId: string): Promise<InewsRundown> {
		return this.downloadINewsRundown(rundownSheetId)
		.then(rundownRaw => {
			this._logger.info(rundownSheetId, ' Downloaded ')
			return this.convertRawtoSofie(this._logger, rundownSheetId, rundownSheetId, rundownRaw)
		})
	}

	convertRawtoSofie (_logger: Winston.LoggerInstance, sheetId: string, name: string, rundownRaw: any[]): InewsRundown {
		_logger.info('START : ', name, ' convert to Sofie Rundown')
		// where should these data come from? 
		let version = 'v0.2'
		let startTime = 0
		let endTime = 1

		let rundown = new InewsRundown(sheetId, name, version, startTime, endTime)
		let segments = ParsedElementsIntoSegments.parse(sheetId,rundownRaw)
		rundown.addSegments(segments)
		_logger.info('DONE : ', name, ' converted to Sofie Rundown')
		return rundown
	}

	emptyInewsFtpBuffer () {
		// TODO: This workaround clears the _queue inside johnsand@inews:
		this.inewsConnection._queue.queuedJobList.list = {}
		this.inewsConnection._queue.inprogressJobList.list = {}
	}

	async downloadINewsRundown (queueName: string): Promise<Array<any>> {
		return new Promise((resolve) => {
			let stories: Array<any> = []
			this.inewsConnection.list(queueName, (error: any, dirList: any) => {
				if (!error && dirList.length > 0) {
					dirList.forEach((storyFile: any, index: number) => {
						this.inewsConnection.story(queueName, storyFile.file, (error: any, story: any) => {
							console.log('DUMMY LOG : ', error)
							stories.push({ 'storyName': storyFile.storyName, 'story': story })
							if (index === dirList.length - 1) {
								resolve(stories)
							}
							this._logger.debug('Queue : ', queueName, error || '', ' Story : ', storyFile.storyName)
						})
					})
				} else {
					this._logger.error('Error downloading iNews rundown : ', error)
					resolve([])
				}
			})
		})
	}
}
