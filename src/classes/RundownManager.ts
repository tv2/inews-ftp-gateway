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

	emptyInewsFtpBuffer () {
		// TODO: This workaround clears the _queue inside johnsand@inews:
		this.inewsConnection._queue.queuedJobList.list = {}
		this.inewsConnection._queue.inprogressJobList.list = {}
	}

	async downloadINewsRundown (queueName: string, oldRundown: InewsRundown): Promise<Array<IRawStory>> {
		return new Promise((resolve) => {
			let stories: Array<IRawStory> = []
			this.inewsConnection.list(queueName, (error: any, dirList: any) => {
				if (!error && dirList.length > 0) {
					dirList.forEach((storyFile: any, index: number) => {

						let modified = String(Date.now()) //To get a unique initializer
						if (typeof(oldRundown) != 'undefined') {
							if (typeof(oldRundown.segments) != 'undefined') {
								if (oldRundown.segments.length > index + 1) {
									modified = oldRundown.segments[index].modified
								}
							}
						}

						stories.push({ 
							'storyName': '', 
							'story': '', 
							'modified': ''
						})

						if (String(storyFile.modified) != String(modified)) {
							this.inewsConnection.story(queueName, storyFile.file, (error: any, story: any) => {
								console.log('DUMMY LOG : ', error)
								stories[index] = { 
									'storyName': storyFile.storyName, 
									'story': story, 
									'modified': storyFile.modified
								}
								if (index === dirList.length - 1) {
									resolve(stories)
								}
								this._logger.debug('Queue : ', queueName, error || '', ' Story : ', storyFile.storyName)
							})
						} else {
							stories[index] = { 
								'storyName': oldRundown.segments[index].name, 
								'story': oldRundown.segments[index].iNewsStory, 
								'modified': oldRundown.segments[index].modified
							}
						}
					})
				} else {
					this._logger.error('Error downloading iNews rundown : ', error)
					resolve([])
				}
			})
		})
	}
}
