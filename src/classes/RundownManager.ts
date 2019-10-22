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

	/**
	 * Downloads a running order by ID.
	 */
	downloadRunningOrder (rundownId: string, oldRundown: InewsRundown): Promise<InewsRundown> {
		return this.downloadINewsRundown(rundownId, oldRundown)
		.then((rundownRaw: IRawStory[]) => {
			this._logger.info(rundownId, ' Downloaded ')
			return this.convertRawtoSofie(this._logger, rundownId, rundownId, rundownRaw)
		})
	}

	/**
	 * Convert a raw rundown from iNews to a sofie rundown.
	 * @param _logger Logger instance.
	 * @param runningOrderId ID of the running order.
	 * @param name Rundown name.
	 * @param rundownRaw Rundown to convert.
	 */
	convertRawtoSofie (_logger: Winston.LoggerInstance, runningOrderId: string, name: string, rundownRaw: IRawStory[]): InewsRundown {
		_logger.info('START : ', name, ' convert to Sofie Rundown')
		// where should these data come from?
		let version = 'v0.2'
		let startTime = 0
		let endTime = 1

		let rundown = new InewsRundown(runningOrderId, name, version, startTime, endTime)
		let segments = ParsedINewsIntoSegments.parse(runningOrderId,rundownRaw)
		rundown.addSegments(segments)
		_logger.info('DONE : ', name, ' converted to Sofie Rundown')
		return rundown
	}

	/**
	 * Clear the FTP buffer to prevent memory leaks.
	 */
	emptyInewsFtpBuffer () {
		// TODO: This workaround clears the _queue inside johnsand@inews:
		this.inewsConnection._queue.queuedJobList.list = {}
		this.inewsConnection._queue.inprogressJobList.list = {}
	}

	/**
	 * Download a rundown from iNews.
	 * @param queueName Name of queue to download.
	 * @param oldRundown Old rundown object.
	 */
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

	/**
	 * Download an iNews story.
	 * @param index Number of story in rundown.
	 * @param queueName Name of queue to download from.
	 * @param storyFile File to download.
	 * @param oldRundown Old rundown to overwrite.
	 */
	downloadINewsStory (index: number, queueName: string, storyFile: any, oldRundown: InewsRundown): Promise<IRawStory> {
		return new Promise((resolve) => {
			let story: IRawStory
			let oldModified = String(Date.now()) // To get a unique initializer
			// tslint:disable-next-line: strict-type-predicates
			if (typeof(oldRundown) !== 'undefined') {
				// tslint:disable-next-line: strict-type-predicates
				if (typeof(oldRundown.segments) !== 'undefined') {
					if (oldRundown.segments.length >= index + 1) {
						oldModified = oldRundown.segments[index].modified
					}
				}
			}

			if (String(storyFile.modified) !== String(oldModified)) {
				this.inewsConnection.story(queueName, storyFile.file, (error: any, story: any) => {
					console.log('DUMMY LOG : ', error)
					this._logger.debug('Queue : ', queueName, error || '', ' Story : ', storyFile.storyName)
					story = {
						'storyName': storyFile.storyName,
						'story': story,
						'modified': storyFile.modified
					}
					resolve(story)
				})
			} else {
				story = {
					'storyName': oldRundown.segments[index].name,
					'story': oldRundown.segments[index].iNewsStory,
					'modified': oldRundown.segments[index].modified
				}
				resolve(story)
			}
		})
	}
}
