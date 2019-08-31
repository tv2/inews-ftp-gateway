import { InewsRundown } from './datastructures/Rundown'
import { IOutputLayer } from 'tv-automation-sofie-blueprints-integration'
import * as Winston from 'winston'
import { SplitRawDataToElements } from './converters/SplitRawDataToElements'
import { ParsedElementsIntoSegments } from './ParsedElementsToSegments'

export class RundownManager {

	private _logger: Winston.LoggerInstance

	constructor (private logger: Winston.LoggerInstance, private inewsConnection: any) {
		this._logger = this.logger
		this.inewsConnection = inewsConnection
	}

	downloadRunningOrder (rundownSheetId: string, outputLayers: IOutputLayer[]): Promise<InewsRundown> {
		return this.downloadINewsRundown(rundownSheetId)
		.then(rundownNSML => {
			this._logger.info(rundownSheetId, ' Downloaded ')
			return this.convertNSMLtoSofie(this._logger, rundownSheetId, rundownSheetId, rundownNSML, outputLayers)
		})
	}

	convertNSMLtoSofie (_logger: Winston.LoggerInstance, sheetId: string, name: string, rundownNSML: any[][], outputLayers: IOutputLayer[]): InewsRundown {
		let parsedData = SplitRawDataToElements.convert(rundownNSML, outputLayers)
		let rundown = new InewsRundown(sheetId, name, parsedData.meta.version, parsedData.meta.startTime, parsedData.meta.endTime)
		_logger.info('START : ', name, ' convert to Sofie Rundown')
		let segments = ParsedElementsIntoSegments.parse(sheetId, parsedData.elements)
		rundown.addSegments(segments)
		_logger.info('DONE : ', name, ' converted to Sofie Rundown')
		return rundown
	}

	async downloadINewsRundown (queueName: string): Promise<Array<any>> {
		return new Promise((resolve) => {
			let stories: Array<any> = []
			this.inewsConnection.list(queueName, (error: any, dirList: any) => {
				if (!error && dirList.length > 0) {
					console.log('File list readed')
					dirList.map((storyFile: any, index: number) => {
						this.inewsConnection.storyNsml(queueName, storyFile.file, (error: any, storyNsml: any) => {
							stories.push({ 'storyName': storyFile.storyName, 'story': storyNsml })
							if (index === dirList.length - 1) {
								resolve(stories)
							}
							this._logger.info('Queue : ', queueName, error || '', ' Story : ', storyFile.storyName)
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
