import { InewsRundown } from './Rundown'
import { IOutputLayer } from 'tv-automation-sofie-blueprints-integration'
import * as DEFAULTS from '../DEFAULTS'

export interface IRundownUpdate {
	value: string | number
	cellPosition: string
}

export class RundownManager {

	constructor (private inewsConnection: any) {
		this.inewsConnection = inewsConnection
	}

	/**
	 * Downloads and parses a Running Order form iNews FTP
	 *
	 * @param rundownSheetId Id of the iNews rundown containing the Running Order
	 */
	downloadRunningOrder (rundownSheetId: string, outputLayers: IOutputLayer[]): Promise<InewsRundown> {
		return this.downloadQueue(rundownSheetId)
		.then(rundownNSML => {
			return InewsRundown.fromNSMLdata(rundownSheetId, 'unknown', rundownNSML, outputLayers, this)
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

	async getSheetsInDriveFolder (folderName: string): Promise<string[]> {
		console.log('DUMMY LOG : ' + folderName)
		return DEFAULTS.INEWS_QUEUE
	}

	/**
	 * validates a Rundown.
	 * @param {string} sheetid Id of the sheet to check.
	 */
	async checkSheetIsValid (sheetid: string): Promise<boolean> {
		console.log('DUMMY LOG : ' + sheetid)
		return Promise.resolve(true)
	}
}
