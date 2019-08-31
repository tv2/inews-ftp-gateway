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
		this._logger.info('Downloading : ' + rundownSheetId)
		return this.downloadINewsRundown(rundownSheetId)
		.then(rundownNSML => {
			return this.convertNSMLtoSofie(this._logger, rundownSheetId, rundownSheetId, rundownNSML, outputLayers)
		})
	}

	convertNSMLtoSofie (_logger: Winston.LoggerInstance, sheetId: string, name: string, rundownNSML: any[][], outputLayers: IOutputLayer[]): InewsRundown {
		let parsedData = SplitRawDataToElements.convert(rundownNSML, outputLayers)
		let rundown = new InewsRundown(sheetId, name, parsedData.meta.version, parsedData.meta.startTime, parsedData.meta.endTime)
		let segments = ParsedElementsIntoSegments.parse(sheetId, parsedData.elements)
		rundown.addSegments(segments)

		_logger.info(name, ' converted to Sofie Rundown')
		return rundown
	}

	async downloadINewsRundown (queueName: string): Promise<Array<any>> {
		return new Promise((resolve, reject) => {
			let stories: Array<any> = []
			this.inewsConnection.list(queueName, (error: any, dirList: any) => {
				if (!error) {
					console.log('File list readed')
					dirList.map((storyFile: any, index: number) => {
						this.inewsConnection.storyNsml(queueName, storyFile.file, (error: any, storyNsml: any) => {
							stories.push({ 'storyName': storyFile.storyName, 'story': storyNsml })
							if (index === dirList.length - 1) {
								resolve(stories)
							}
							console.log('DUMMY LOG : ' + error)
						})
					})
				} else {
					console.log('Error connetiong iNews :', error)
					reject(error)
				}
			})
			console.log('Stories recieved')
		})
	}
}
