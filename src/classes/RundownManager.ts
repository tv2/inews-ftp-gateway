import { InewsRundown } from './datastructures/Rundown'
import { IOutputLayer } from 'tv-automation-sofie-blueprints-integration'
import * as DEFAULTS from '../DEFAULTS'
import * as Winston from 'winston'
import { SplitRawDataToElements } from './SplitRawDataToElements'
import { ParsedElementsIntoSegments } from './ParsedElementsToSegments'

export class RundownManager {

	private _logger: Winston.LoggerInstance

	constructor (private logger: Winston.LoggerInstance, private inewsConnection: any) {
		this._logger = this.logger
		this.inewsConnection = inewsConnection
	}

	/**
	 * Downloads and parses a Running Order form iNews FTP
	 *
	 * @param rundownSheetId Id of the iNews rundown containing the Running Order
	 */
	downloadRunningOrder (rundownSheetId: string, outputLayers: IOutputLayer[]): Promise<InewsRundown> {
		this._logger.info('Downloading : ' + rundownSheetId)
		return this.downloadQueue(rundownSheetId)
		.then(rundownNSML => {
			return this.fromNSMLdata(this._logger, rundownSheetId, rundownSheetId, rundownNSML, outputLayers, this)
		})
	}

	/**
	 * Downloads NSML data from iNEWS FTP SERVER
	 *
	 * @param queueId Queue Id of the iNews queue to download
	 */
	downloadQueue (queueName: string) {
		let now = new Date().getTime()
		let stories = this.getInewsData(queueName)
		.then((data: any) => {
			let timeSpend = (new Date().getTime() - now) / 1000
			console.log('FTP read time : ', timeSpend)
			return data
		})

		return Promise.resolve(stories)
	}


	/**
	 *
	 * @param _logger Winston logger instance
	 * @param sheetId Id of the sheet
	 * @param name Name of the sheet (often the title)
	 * @param rundownNSML Cells of the sheet
	 * @param sheetManager Optional; Will be used to update the sheet if changes, such as ID-updates, needs to be done.
	 */
	private fromNSMLdata (_logger: Winston.LoggerInstance, sheetId: string, name: string, rundownNSML: any[][], outputLayers: IOutputLayer[], sheetManager?: RundownManager): InewsRundown {
		console.log('DUMMY LOG : ' + sheetManager)
		_logger.info('Converting ', name, ' to Sofie')
		let parsedData = SplitRawDataToElements.convert(rundownNSML, outputLayers)
		let rundown = new InewsRundown(sheetId, name, parsedData.meta.version, parsedData.meta.startTime, parsedData.meta.endTime)
		let segments = ParsedElementsIntoSegments.parse(sheetId, parsedData.elements)
		rundown.addSegments(segments)

		_logger.info(name, ' converted to Sofie Rundown')
		return rundown
	}

	async getInewsData (queueName: string): Promise<Array<any>> {
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

	async getRunningOrdersList (folderName: string): Promise<string[]> {
		console.log('DUMMY LOG : ' + folderName)
		return DEFAULTS.INEWS_QUEUE
	}

	/**
	 * validates a Rundown.
	 * @param {string} sheetid Id of the sheet to check.
	 */
	async checkRundownIsValid (sheetid: string): Promise<boolean> {
		console.log('DUMMY LOG : ' + sheetid)
		return Promise.resolve(true)
	}
}
