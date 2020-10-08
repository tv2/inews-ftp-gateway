import { INewsRundown } from './datastructures/Rundown'
import * as Winston from 'winston'
import { ParsedINewsIntoSegments, SegmentRankings } from './ParsedINewsToSegments'
import { INewsClient, INewsStory, INewsDirItem, INewsFile } from 'inews'
import { promisify } from 'util'
import { INewsStoryGW } from './datastructures/Segment'
import _ = require('underscore')
import { ReducedRundown } from './RundownWatcher'

function isFile (f: INewsDirItem): f is INewsFile {
	return f.filetype === 'file'
}

export class RundownManager {

	private previousRanks: SegmentRankings = new Map()

	// TODO: This could be cleaned up
	private _listStories!: (queueName: string) => Promise<Array<INewsDirItem>>
	private _getStory!: (queueName: string, story: string) => Promise<INewsStory>

	constructor (private _logger?: Winston.LoggerInstance, private inewsConnection?: INewsClient) {
		if (this.inewsConnection) {
			this._listStories = promisify(this.inewsConnection.list).bind(this.inewsConnection)
			this._getStory = promisify(this.inewsConnection.story).bind(this.inewsConnection)
		}
	}

	/**
	 * Downloads a rundown by ID.
	 */
	async downloadRundown (rundownId: string, oldRundown?: ReducedRundown): Promise<INewsRundown> {
		return this.convertRawtoSofie(rundownId, rundownId, rundownRaw)
	}

	/**
	 * Convert a raw rundown from iNews to a sofie rundown.
	 * @param _logger Logger instance.
	 * @param rundownId ID of the rundown.
	 * @param name Rundown name.
	 * @param rundownRaw Rundown to convert.
	 */
	convertRawtoSofie (rundownId: string, name: string, rundownRaw: INewsStoryGW[]): INewsRundown {
		this._logger?.info('START : ', name, ' convert to Sofie Rundown')
		// where should these data come from?
		let version = 'v0.2'

		let rundown = new INewsRundown(rundownId, rundownId, version)
		const removedSegments: string[] = []
		let segments = ParsedINewsIntoSegments.parse(rundownId, rundownRaw, this.previousRanks, undefined, removedSegments)

		// Should be rewritten, an update may only include one story
		// const previousRanksMap = this.previousRanks.get(rundownId) || new Map()
		const previousRanksMap = new Map()
		// removedSegments.forEach((segment) => {
		// 	console.log('delete', segment)
		// 	previousRanksMap.delete(segment)
		// })
		segments.forEach((segment, position) => {
			previousRanksMap.set(segment.externalId, {
				rank: segment.rank,
				position: position + 1
			})
		})
		this.previousRanks.set(rundownId, previousRanksMap)

		rundown.addSegments(segments)
		this._logger?.info('DONE : ', name, ' converted to Sofie Rundown')
		return rundown
	}

	/**
	 * Download a rundown from iNews.
	 * @param queueName Name of queue to download.
	 * @param oldRundown Old rundown object.
	 */
	async downloadINewsRundown (queueName: string, oldRundown?: INewsRundown): Promise<Array<INewsStoryGW>> {
		let stories: Array<INewsStoryGW> = []
		try {
			let dirList = await this._listStories(queueName)
			if (dirList.length > 0) {
				stories = _.compact(await Promise.all(
					dirList.map((ftpFileName: INewsDirItem) => {
						if (!oldRundown) return this.downloadINewsStory(queueName, ftpFileName)
						const oldSegment = this.findOldSegment(ftpFileName.file, oldRundown)
						if (!oldSegment || this.shouldDownloadSegment(oldSegment, ftpFileName.modified)) {
							return this.downloadINewsStory(queueName, ftpFileName)
						} else {
							return oldSegment
						}
					})))
			} else {
				this._logger?.error('Downloaded empty iNews rundown.')
			}
		} catch (err) {
			this._logger?.error('Error downloading iNews rundown: ', err, err.stack)
		}
		return stories
	}

	/**
	 * Returns true if a file should be redownloaded.
	 * @param oldSegment Cached segment to compare to.
	 * @param lastModified When the file was modified.
	 */
	private shouldDownloadSegment (oldSegment: INewsStoryGW, lastModified?: Date): boolean {
		if (!lastModified) return true

		const oldModified = Math.floor(parseFloat(oldSegment.fields.modifyDate) / 100)

		const fileDate = Math.floor(lastModified.getTime() / 100000)

		if (
			fileDate - oldModified > 1 ||
			Date.now() / 100000 - fileDate <= 1
		) return true

		return false
	}

	/**
	 * Finds an old segment with a given external Id in a rundown.
	 * @param segmentId
	 * @param rundown
	 */
	private findOldSegment (segmentId: string, rundown: INewsRundown): INewsStoryGW | undefined {
		const oldSegment = rundown.segments.find((segment) => segment.externalId === segmentId)

		if (!oldSegment) return undefined
		return oldSegment.iNewsStory
	}

	/**
	 * Download an iNews story.
	 * @param index Number of story in rundown.
	 * @param queueName Name of queue to download from.
	 * @param storyFile File to download.
	 * @param oldRundown Old rundown to overwrite.
	 */
	async downloadINewsStory (queueName: string, storyFile: INewsDirItem): Promise<INewsStoryGW | undefined> {
		let story: INewsStoryGW
		try {
			story = { ...await this._getStory(queueName, storyFile.file), identifier: (storyFile as INewsFile).identifier }
		} catch (err) {
			this._logger?.error(`Error downloading iNews story: ${err}`)
			return undefined
		}

		this._logger?.debug('Downloaded : ' + queueName + ' : ' + (storyFile as INewsFile).identifier)
		/* Add fileId and update modifyDate to ftp reference in storyFile */
		story.fields.modifyDate = `${storyFile.modified ? storyFile.modified.getTime() / 1000 : 0}`
		this._logger?.debug('Queue : ', queueName, ' Story : ', isFile(storyFile) ? storyFile.storyName : storyFile.file)
		return story
	}

	/**
	 * Downloads a segment from iNews with a given file name (externalId).
	 * @param queueName Rundown to download from.
	 * @param segmentId Segment to download.
	 */
	async downloadINewsStoryById (queueName: string, segmentId: string): Promise<INewsStoryGW | undefined> {
		let dirList = await this._listStories(queueName)

		if (dirList.length > 0) {
			const segment = dirList.find((segment: INewsDirItem) => (segment as INewsFile).identifier === segmentId)

			if (!segment) return Promise.reject(`Cannot find segment with name ${segmentId}`)

			return this.downloadINewsStory(queueName, segment)
		} else {
			return Promise.reject(`Cannot find rundown with Id ${queueName}`)
		}
	}
}
