import { INewsRundown } from './datastructures/Rundown'
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

	// TODO: This could be cleaned up
	private _listStories!: (queueName: string) => Promise<Array<INewsDirItem>>
	private _getStory!: (queueName: string, story: string) => Promise<INewsStory>

	constructor (private _logger: Winston.LoggerInstance, private inewsConnection?: INewsClient) {
		// this.queueLock = false
		if (this.inewsConnection) {
			this._listStories = promisify(this.inewsConnection.list).bind(this.inewsConnection)
			this._getStory = promisify(this.inewsConnection.story).bind(this.inewsConnection)
		}
	}

	/**
	 * Downloads a rundown by ID.
	 */
	async downloadRundown (rundownId: string): Promise<INewsRundown> {

		/**
		 * When running as DEV, send a fake rundown (for testing detached from iNews).
		 */
		if (process.env.DEV) {
			return Promise.resolve(this.fakeRundown())
		}
		let rundownRaw = await this.downloadINewsRundown(rundownId)
		this._logger.info(rundownId, ' Downloaded ')
		return this.convertRawtoSofie(rundownId, rundownId, rundownRaw)
	}

	/**
	 * returns a promise with a fake rundown for testing
	 * in detached mode
	 */
	fakeRundown (id: string = '135381b4-f11a-4689-8346-b298b966664f'): INewsRundown {
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
	 * @param rundownId ID of the rundown.
	 * @param name Rundown name.
	 * @param rundownRaw Rundown to convert.
	 */
	convertRawtoSofie (rundownId: string, name: string, rundownRaw: INewsStoryGW[]): INewsRundown {
		this._logger.info('START : ', name, ' convert to Sofie Rundown')
		// where should these data come from?
		let version = 'v0.2'

		let rundown = new INewsRundown(rundownId, rundownId, version)
		let segments = ParsedINewsIntoSegments.parse(rundownId, rundownRaw, this.previousRanks)
		this.previousRanks[rundownId] = {}
		segments.forEach((segment, position) => {
			this.previousRanks[rundownId][segment.externalId] = {
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
	async downloadINewsRundown (queueName: string): Promise<Array<INewsStoryGW>> {
		// this.queueLock = true
		let stories: Array<INewsStoryGW> = []
		try {
			let dirList = await this._listStories(queueName)
			if (dirList.length > 0) {
				stories = await Promise.all(
					dirList.map((ftpFileName: INewsDirItem) => {
						return this.downloadINewsStory(queueName, ftpFileName)
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
	async downloadINewsStory (queueName: string, storyFile: INewsDirItem): Promise<INewsStoryGW> {
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

		this._logger.info('Downloaded : ' + queueName + ' : ' + (storyFile as INewsFile).identifier)
		/* Add fileId and update modifyDate to ftp reference in storyFile */
		story.fields.modifyDate = `${storyFile.modified ? storyFile.modified.getTime() / 1000 : 0}`
		this._logger.debug('Queue : ', queueName, error || '', ' Story : ', isFile(storyFile) ? storyFile.storyName : storyFile.file)
		return story
	}
}
