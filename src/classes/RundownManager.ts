import * as Winston from 'winston'
import { INewsClient, INewsDirItem, INewsFile, INewsStory } from 'inews'
import { promisify } from 'util'
import { INewsStoryGW } from './datastructures/Segment'
import { ReducedRundown, ReducedSegment, UnrankedSegment } from './RundownWatcher'
import { literal, parseModifiedDateFromInewsStoryWithFallbackToNow, ReflectPromise } from '../helpers'
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
							modified: ftpFileName.modified ?? new Date(0),
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
			this._logger?.error(`Error downloading iNews story: ${err}`)
			return undefined
		}

		this._logger?.debug('Downloaded : ' + queueName + ' : ' + (storyFile as INewsFile).identifier)
		/* Add fileId and update modifyDate to ftp reference in storyFile */
		story.fields.modifyDate = `${storyFile.modified ? storyFile.modified.getTime() / 1000 : 0}`
		this._logger?.debug('Queue : ', queueName, ' Story : ', isFile(storyFile) ? storyFile.storyName : storyFile.file)

		this.generateDesignCuesFromFields(story)
		return story
	}

	public generateDesignCuesFromFields(story: INewsStoryGW) {
		if (!story.fields.layout) {
			return
		}
		this.removeDesignCueFromBody(story)
		this.addDesignLinkToStory(story)
		this.addDesignCueToStory(story)
	}

	private removeDesignCueFromBody(story: INewsStory) {
		let designCueIndex = story.cues.findIndex((c) => c && c.some((s) => s.includes('DESIGN')))
		if (designCueIndex >= 0) {
			const array = story.body!.split('<p>')
			const index = array.findIndex((s) => s.includes(`<\a idref="${designCueIndex}">`))
			if (index >= 0) {
				array.splice(index, 1)
				story.body = this.reAssembleBody(array)
			}
		}
	}

	private reAssembleBody(array: string[]): string {
		return array.reduce((previousValue, currentValue) => {
			return `${previousValue}<p>${currentValue}`
		})
	}

	private addDesignLinkToStory(story: INewsStory) {
		const layoutCueIndex = story.cues.length
		const lines = story.body!.split('<p>')
		const primaryIndex = lines.findIndex((line) => !!line.match(/<pi>(.*?)<\/pi>/i))
		story.body =
			primaryIndex > 0
				? this.insertDesignLinkAfterFirstPrimaryCue(lines, primaryIndex, layoutCueIndex)
				: story.body!.concat(`<p><\a idref="${layoutCueIndex}"></a></p>`)
	}

	private insertDesignLinkAfterFirstPrimaryCue(lines: string[], typeIndex: number, layoutCueIndex: number): string {
		const throughPrimaryCueHalf = lines.slice(0, typeIndex + 1)
		const afterPrimaryCueHalf = lines.slice(typeIndex + 1, lines.length)
		return this.reAssembleBody([
			...throughPrimaryCueHalf,
			`<\a idref="${layoutCueIndex}"></a></p>\r\n`,
			...afterPrimaryCueHalf,
		])
	}

	private addDesignCueToStory(story: INewsStory): void {
		story.cues.push([`DESIGN_LAYOUT=${story.fields.layout!.toUpperCase()}`])
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
