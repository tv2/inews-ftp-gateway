import * as Winston from 'winston'
import { INewsClient, INewsStory, INewsDirItem, INewsFile, INewsFields } from 'inews'
import { promisify } from 'util'
import { INewsStoryGW } from './datastructures/Segment'
import { ReducedRundown, ReducedSegment, UnrankedSegment } from './RundownWatcher'
import { literal, ParseDateFromInews, ReflectPromise } from '../helpers'
import { VERSION } from '../version'
import { SegmentId } from '../helpers/id'

function isFile(f: INewsDirItem): f is INewsFile {
	return f.filetype === 'file'
}

export class RundownManager {
	private _listStories!: (queueName: string) => Promise<Array<INewsDirItem>>
	private _getStory!: (queueName: string, story: string) => Promise<INewsStory>

	constructor(private _logger?: Winston.LoggerInstance, private inewsConnection?: INewsClient) {
		if (this.inewsConnection) {
			this._listStories = promisify(this.inewsConnection.list).bind(this.inewsConnection)
			this._getStory = promisify(this.inewsConnection.story).bind(this.inewsConnection)
		}
	}

	/**
	 * Downloads a rundown by ID.
	 */
	async downloadRundown(rundownId: string): Promise<ReducedRundown> {
		let reducedRundown = await this.downloadINewsRundown(rundownId)
		return reducedRundown
	}

	/**
	 * Download a rundown from iNews.
	 * @param queueName Name of queue to download.
	 * @param oldRundown Old rundown object.
	 */
	async downloadINewsRundown(queueName: string): Promise<ReducedRundown> {
		const rundown: ReducedRundown = {
			externalId: queueName,
			name: queueName,
			gatewayVersion: VERSION,
			segments: [],
		}
		try {
			let dirList = await this._listStories(queueName)
			dirList.forEach((ftpFileName: INewsDirItem, index) => {
				if (isFile(ftpFileName)) {
					rundown.segments.push(
						literal<ReducedSegment>({
							externalId: ftpFileName.identifier,
							name: ftpFileName.storyName,
							modified: ftpFileName.modified || new Date(0),
							locator: ftpFileName.locator,
							rank: index,
						})
					)
				}
			})
		} catch (err) {
			this._logger?.error('Error downloading iNews rundown: ', err, err.stack)
		}
		return rundown
	}

	public async fetchINewsStoriesById(
		queueName: string,
		segmentExternalIds: SegmentId[]
	): Promise<Map<SegmentId, UnrankedSegment>> {
		const stories = new Map<SegmentId, UnrankedSegment>()
		const dirList = await this._listStories(queueName)
		const ps: Array<Promise<INewsStoryGW | undefined>> = []

		for (const storyExternalId of segmentExternalIds) {
			ps.push(this.downloadINewsStoryById(queueName, storyExternalId, dirList))
		}

		const results = await Promise.all(ps.map(ReflectPromise))

		results.forEach((result) => {
			if (result.status === 'fulfilled') {
				const rawSegment = result.value
				if (rawSegment) {
					const segment: UnrankedSegment = {
						externalId: rawSegment.identifier,
						name: rawSegment.fields.title ? rawSegment.fields.title : '',
						modified: ParseDateFromInews(rawSegment.fields.modifyDate ? rawSegment.fields.modifyDate : ''),
						locator: rawSegment.locator,
						rundownId: queueName,
						iNewsStory: rawSegment,
					}
					stories.set(rawSegment.identifier, segment)
				}
			}
		})

		return stories
	}

	/*
	 * Download an iNews story.
	 * @param storyFile File to download.
	 * @param oldRundown Old rundown to overwrite.
	 */
	async downloadINewsStory(queueName: string, storyFile: INewsDirItem): Promise<INewsStoryGW | undefined> {
		let story: INewsStoryGW
		try {
			story = {
				...(await this._getStory(queueName, storyFile.file)),
				identifier: (storyFile as INewsFile).identifier,
				locator: (storyFile as INewsFile).locator,
			}
		} catch (err) {
			this._logger?.error(`Error downloading iNews story: ${err}`)
			return undefined
		}

		story.fields = this.getTypesafeInewsFields(story.fields, storyFile)
		this._logger?.debug('Downloaded : ' + queueName + ' : ' + (storyFile as INewsFile).identifier)
		this._logger?.debug('Queue : ', queueName, ' Story : ', isFile(storyFile) ? storyFile.storyName : storyFile.file)
		return story
	}

	private getTypesafeInewsFields(fields: INewsFields, storyFile: INewsDirItem): INewsFields {
		const modifyDate: string = `${storyFile.modified ? storyFile.modified.getTime() / 1000 : 0}`
		return literal<INewsFields>({
			title: fields.title ? fields.title : '',
			modifyDate: modifyDate,
			pageNumber: fields.pageNumber ? fields.pageNumber : '',
			tapeTime: fields.tapeTime ? fields.tapeTime : '',
			audioTime: fields.audioTime ? fields.audioTime : '',
			totalTime: fields.totalTime ? fields.totalTime : '',
			cumeTime: fields.cumeTime ? fields.cumeTime : '',
			backTime: fields.backTime ? fields.backTime : '',
		})
	}

	/**
	 * Downloads a segment from iNews with a given file name (externalId).
	 * @param queueName Rundown to download from.
	 * @param segmentId Segment to download.
	 */
	async downloadINewsStoryById(
		queueName: string,
		segmentId: string,
		dirList: Array<INewsDirItem>
	): Promise<INewsStoryGW | undefined> {
		dirList = dirList || (await this._listStories(queueName))
		if (dirList.length > 0) {
			const segment = dirList.find((segment: INewsDirItem) => (segment as INewsFile).identifier === segmentId)

			if (!segment) return Promise.reject(`Cannot find segment with name ${segmentId}`)

			return this.downloadINewsStory(queueName, segment)
		} else {
			return Promise.reject(`Cannot find rundown with Id ${queueName}`)
		}
	}
}
