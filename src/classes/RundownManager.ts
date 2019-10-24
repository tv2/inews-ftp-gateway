import { InewsRundown } from './datastructures/Rundown'
import * as Winston from 'winston'
import { ParsedINewsIntoSegments } from './ParsedINewsToSegments'

export interface IRawStory {
	'storyName': string
	'story': any
	'modified': string
}

export class RundownManager {

	private _logger: Winston.LoggerInstance

	constructor (private logger: Winston.LoggerInstance, private inewsConnection: any) {
		this._logger = this.logger
		this.inewsConnection = inewsConnection
	}

	downloadRunningOrder (rundownSheetId: string, oldRundown: InewsRundown): Promise<InewsRundown> {
		return this.downloadINewsRundown(rundownSheetId, oldRundown)
		.then((rundownRaw: IRawStory[]) => {
			this._logger.info(rundownSheetId, ' Downloaded ')
			return this.convertRawtoSofie(this._logger, rundownSheetId, rundownSheetId, rundownRaw)
		})
	}

	convertRawtoSofie (_logger: Winston.LoggerInstance, sheetId: string, name: string, rundownRaw: IRawStory[]): InewsRundown {
		_logger.info('START : ', name, ' convert to Sofie Rundown')
		// where should these data come from?
		let version = 'v0.2'
		let startTime = 0
		let endTime = 1

		let rundown = new InewsRundown(sheetId, name, version, startTime, endTime)
		let segments = ParsedINewsIntoSegments.parse(sheetId,rundownRaw)
		rundown.addSegments(segments)
		_logger.info('DONE : ', name, ' converted to Sofie Rundown')
		return rundown
	}

	/**
	 * This is a workaround, as the buffers inside the iNewsFTP service is not
	 * flushed after use.
	 */
	emptyInewsFtpBuffer () {
		// TODO: This workaround clears the _queue inside johnsand@inews:
		this.inewsConnection._queue.queuedJobList.list = {}
		this.inewsConnection._queue.inprogressJobList.list = {}
	}

	async downloadINewsRundown (queueName: string, oldRundown: InewsRundown): Promise<Array<IRawStory>> {
		return new Promise((resolve) => {
			return this.inewsConnection.list(queueName, (error: any, dirList: any) => {
				if (!error && dirList.length > 0) {
					resolve(Promise.all(dirList.map((ftpFileName: string, index: number) => {
						return this.downloadINewsStory(index, queueName, ftpFileName, oldRundown)
					})))
				} else {
					this._logger.error('Error downloading iNews rundown : ', error)
					resolve([])
				}
			})
		})
	}
	downloadINewsStory (index: number, queueName: string, storyFile: any, oldRundown: InewsRundown): Promise<IRawStory> {
		return new Promise((resolve) => {
			let story: IRawStory
			let oldModified = Math.floor(parseFloat(oldRundown.segments[index].iNewsStory.fields.modifyDate) / 100)

			// The date from the iNews FTP server is only per whole minute, and the iNews modifyDate
			// is per second. So time time will be compared for changes within 1 minute. And if the
			// story has been updates within the last minute, it will keep updating for a whole minute.
			let fileDate = Math.floor(Date.parse(storyFile.modified) / 100000)


			if (fileDate - oldModified > 1 || Date.now() / 100000 - fileDate < 1) {
				this.inewsConnection.story(queueName, storyFile.file, (error: any, story: any) => {
					console.log('DUMMY LOG : ', error)
					this._logger.debug('Queue : ', queueName, error || '', ' Story : ', storyFile.storyName)
					story = {
						'storyName': storyFile.storyName,
						'story': story,
						'modified': story.fields.modifyDate
					}
					resolve(story)
				})
			} else {
				story = {
					'storyName': oldRundown.segments[index].name,
					'story': oldRundown.segments[index].iNewsStory,
					'modified': oldRundown.segments[index].iNewsStory.fields.modifyDate
				}
				resolve(story)
			}
		})
	}
}
