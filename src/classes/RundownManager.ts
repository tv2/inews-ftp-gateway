import { InewsRundown } from './datastructures/Rundown'
import * as Winston from 'winston'
import { ParsedINewsIntoSegments, SegmentRankings } from './ParsedINewsToSegments'
import { INewsClient, INewsStory, INewsDirItem, INewsFile } from '@johnsand/inews'
import { promisify } from 'util'
import { INewsStoryGW } from './datastructures/Segment'

function isFile (f: INewsDirItem): f is INewsFile {
	return f.filetype === 'file'
}

export class RundownManager {

	private previousRanks: SegmentRankings = {}

	// public queueLock: boolean
	private _listStories: (queueName: string) => Promise<Array<INewsDirItem>>
	private _getStory: (queueName: string, story: string) => Promise<INewsStory>

	constructor (private _logger: Winston.LoggerInstance, private inewsConnection?: INewsClient) {
		// this.queueLock = false
		if (this.inewsConnection) {
			this._listStories = promisify(this.inewsConnection.list).bind(this.inewsConnection)
			this._getStory = promisify(this.inewsConnection.story).bind(this.inewsConnection)
		}
	}

	/**
	 * Downloads a running order by ID.
	 */
	async downloadRunningOrder (rundownId: string, oldRundown: InewsRundown): Promise<InewsRundown> {

		/**
		 * When running as DEV, send a fake rundown (for testing detached from iNews).
		 */
		if (process.env.DEV) {
			return Promise.resolve(this.fakeRundown())
		}
		let rundownRaw = await this.downloadINewsRundown(rundownId, oldRundown)
		this._logger.info(rundownId, ' Downloaded ')
		return this.convertRawtoSofie(rundownId, rundownId, rundownRaw)
	}

	/**
	 * returns a promise with a fake rundown for testing
	 * in detached mode
	 */
	fakeRundown (id: string = '135381b4-f11a-4689-8346-b298b966664f'): InewsRundown {
		let ftpData: { default: { story: INewsStory, storyName: string}[] } = require('./fakeFTPData')
		let stories: INewsStoryGW[] = ftpData.default.map(x =>
			Object.assign(x.story, { fileId: x.storyName }))
		let rundown = this.convertRawtoSofie(
			id,
			id,
			stories)
	  return rundown
	}

	/**
	 * Convert a raw rundown from iNews to a sofie rundown.
	 * @param _logger Logger instance.
	 * @param runningOrderId ID of the running order.
	 * @param name Rundown name.
	 * @param rundownRaw Rundown to convert.
	 */
	convertRawtoSofie (runningOrderId: string, name: string, rundownRaw: INewsStoryGW[]): InewsRundown {
		this._logger.info('START : ', name, ' convert to Sofie Rundown')
		// where should these data come from?
		let version = 'v0.2'

		let rundown = new InewsRundown(runningOrderId, runningOrderId, version)
		let segments = ParsedINewsIntoSegments.parse(runningOrderId, rundownRaw, this.previousRanks)
		this.previousRanks = {}
		segments.forEach((segment, position) => {
			this.previousRanks[segment.externalId] = {
				rank: segment.rank,
				position: position + 1
			}
		})
		rundown.addSegments(segments)
		this._logger.info('DONE : ', name, ' converted to Sofie Rundown')
		return rundown
	}

	/**
	 * Download a rundown from iNews.
	 * @param queueName Name of queue to download.
	 * @param oldRundown Old rundown object.
	 */
	async downloadINewsRundown (queueName: string, oldRundown: InewsRundown): Promise<Array<INewsStoryGW>> {
		// this.queueLock = true
		let stories: Array<INewsStoryGW> = []
		try {
			let dirList = await this._listStories(queueName)
			if (dirList.length > 0) {
				stories = await Promise.all(
					dirList.map((ftpFileName: INewsDirItem, index: number) => {
						return this.downloadINewsStory(index, queueName, ftpFileName, oldRundown)
					}))
			} else {
				this._logger.error('Downloaded empty iNews rundown.')
			}
		} catch (err) {
			this._logger.error('Error downloading iNews rundown: ', err, err.stack)
		} /* finally {
			this.queueLock = false
		} */
		return stories
	}

	/**
	 * Download an iNews story.
	 * @param index Number of story in rundown.
	 * @param queueName Name of queue to download from.
	 * @param storyFile File to download.
	 * @param oldRundown Old rundown to overwrite.
	 */
	async downloadINewsStory (index: number, queueName: string, storyFile: INewsDirItem, oldRundown: InewsRundown): Promise<INewsStoryGW> {
		let oldModified = 0
		let oldFileId: string | undefined

		if (oldRundown
			&& Array.isArray(oldRundown.segments)
			&& oldRundown.segments.length > index
		) {
			oldFileId = oldRundown.segments[index].iNewsStory.fileId
			// oldModified = Math.floor(parseFloat(oldRundown.segments[index].modified) / 100000)
			oldModified = Math.floor(parseFloat(oldRundown.segments[index].iNewsStory.fields.modifyDate) / 100)
		}

		/** The date from the iNews FTP server is only per whole minute, and the iNews modifyDate
		 * is per second. So time time will be compared for changes within 1 minute. And if the
		 * story has been updates within the last minute, it will keep updating for a whole minute.
		 */
		let fileDate = storyFile.modified ? Math.floor(storyFile.modified.getTime() / 100000) : 0

		if (fileDate - oldModified > 1
			|| Date.now() / 100000 - fileDate <= 1
			|| storyFile.file !== oldFileId
		) {
			let story: INewsStoryGW
			let error: Error | null = null
			try {
				story = { ...await this._getStory(queueName, storyFile.file), fileId: storyFile.file, identifier: (storyFile as INewsFile).identifier }
			} catch (err) {
				console.log('DUMMY LOG : ', err)
				error = err
				story = { // Create an empty story when an error occurs
					fields: {},
					meta: {},
					cues: [],
					fileId: storyFile.file,
					error: (err as Error).message,
					identifier: ''
				}
			}

			this._logger.info('UPDATING : ' + queueName + ' : ' + (storyFile as INewsFile).identifier)
			/* Add fileId and update modifyDate to ftp reference in storyFile */
			story.fields.modifyDate = `${storyFile.modified ? storyFile.modified.getTime() / 1000 : 0}`
			this._logger.debug('Queue : ', queueName, error || '', ' Story : ', isFile(storyFile) ? storyFile.storyName : storyFile.file)
			return story
		} else {
			return oldRundown.segments[index].iNewsStory
		}
	}
}
