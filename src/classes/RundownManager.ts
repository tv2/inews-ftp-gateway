import { INewsClient, INewsDirItem, INewsFile, INewsStory } from 'inews'
import { promisify } from 'util'
import { INewsStoryGW } from './datastructures/Segment'
import { ReducedRundown, ReducedSegment, UnrankedSegment } from './RundownWatcher'
import { literal, parseModifiedDateFromInewsStoryWithFallbackToNow, ReflectPromise } from '../helpers'
import { VERSION } from '../version'
import { SegmentId } from '../helpers/id'
import { ILogger } from '@tv2media/logger'
import { CoreHandler } from "../coreHandler";
import { StatusCode } from "@sofie-automation/shared-lib/dist/lib/status";

function isFile(f: INewsDirItem): f is INewsFile {
	return f.filetype === 'file'
}

export class RundownManager {
	private _listStories!: (queueName: string) => Promise<Array<INewsDirItem>>
	private _getStory!: (queueName: string, story: string) => Promise<INewsStory>

	constructor(private _logger: ILogger, private inewsConnection: INewsClient, private coreHandler: CoreHandler) {
		this._listStories = promisify(this.inewsConnection.list).bind(this.inewsConnection)
		this._getStory = promisify(this.inewsConnection.story).bind(this.inewsConnection)
	}

	/**
	 * Downloads a rundown by ID.
	 */
	async downloadRundown(rundownId: string): Promise<ReducedRundown> {
		return this.downloadINewsRundown(rundownId)
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
							modified: ftpFileName.modified ?? new Date(0),
							locator: ftpFileName.locator,
							rank: index,
						})
					)
				}
			})
		} catch (error) {
			this._logger.data(error).error('Error downloading iNews rundown:')
			await this.coreHandler.setStatus(StatusCode.FATAL, ['Error downloading iNews rundown', (error as Error).message])
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
						name: rawSegment.fields.title ?? '',
						modified: parseModifiedDateFromInewsStoryWithFallbackToNow(rawSegment),
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
			this._logger.error(`Error downloading iNews story: ${err}`)
			return undefined
		}

		this._logger.debug('Downloaded : ' + queueName + ' : ' + (storyFile as INewsFile).identifier)
		/* Add fileId and update modifyDate to ftp reference in storyFile */
		story.fields.modifyDate = `${storyFile.modified ? storyFile.modified.getTime() / 1000 : 0}`

		this._logger.debug(`Queue: ${queueName} Story: ${isFile(storyFile) ? storyFile.storyName : storyFile.file}`)

		return story
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

	emptyInewsFtpBuffer() {
		if (this.inewsConnection) {
			this.inewsConnection._queue.queuedJobList.list = {}
			this.inewsConnection._queue.inprogressJobList.list = {}
		}
	}
}
