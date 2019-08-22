import { InewsRundown } from './Rundown'
import { IOutputLayer } from 'tv-automation-sofie-blueprints-integration'
import * as DEFAULTS from '../DEFAULTS'

const SHEET_NAME = process.env.SHEET_NAME || 'Rundown'

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
		return this.downloadSheet(rundownSheetId)
		.then(data => {
			console.log('DUMMY LOG : ' + data)
			return InewsRundown.fromSheetCells(rundownSheetId, 'unknown', [], outputLayers, this)
		})
	}

	/**
	 * Downloads raw data from google spreadsheets
	 *
	 * @param spreadsheetId Id of the google spreadsheet to download
	 */
	downloadSheet (spreadsheetId: string) {
		const request = {
			// The spreadsheet to request.
			auth: this.inewsConnection,
			spreadsheetId,
			// The ranges to retrieve from the spreadsheet.
			range: SHEET_NAME // Get all cells in Rundown sheet

		}
		console.log('DUMMY LOG :' + request)
		return Promise.all([
			console.log('DUMMY1'),
			console.log('DUMMY2')])
			.then(([meta, values]) => {
				return {
					meta: meta,
					values: values

				}
			})
	}

	async getSheetsInDriveFolder (folderName: string): Promise<string[]> {
		console.log('DUMMY LOG : ' + folderName)
		return DEFAULTS.INEWS_QUEUE
	}

	/**
	 * Checks if a sheet contains the 'Rundown' range.
	 * @param {string} sheetid Id of the sheet to check.
	 */
	async checkSheetIsValid (sheetid: string): Promise<boolean> {
		console.log('DUMMY LOG : ' + sheetid)
		return Promise.resolve(true)
	}
}
