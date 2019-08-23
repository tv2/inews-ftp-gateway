import { v4 as uuidV4 } from 'uuid'
import { RundownSegment } from './Segment'
import { IRundownPart } from './Part'
import { RundownPiece } from './Piece'
import { IRundownUpdate, RundownManager } from './RundownManager'
import * as _ from 'underscore'
import { IOutputLayer } from 'tv-automation-sofie-blueprints-integration'
import { NsmlToJson } from './NsmlToJson'

interface IRundownMetaData {
	version: string
	startTime: number
	endTime: number
}

interface IParsedElement {
	meta: {
		rowPosition: number,
		propColPosition: {
			[attrName: string]: number
		}
	},
	data: {
		id?: string
		name?: string
		type?: string
		float: string
		script?: string
		objectType?: string
		objectTime?: string
		duration?: string
		clipName?: string
		feedback?: string
		transition?: string
		attributes?: {[key: string]: string}
	}
}

export interface IRundown {
	externalId: string
	name: string // namnet på sheeten
	expectedStart: number // unix time
	expectedEnd: number // unix time
}

export class InewsRundown implements IRundown {
	// id: string
	// name: string // namnet på sheeten
	// expectedStart: number // unix time
	// expectedEnd: number // unix time
	// sections: Section[] = []
	constructor (
		public externalId: string,
		public name: string,
		public gatewayVersion: string,
		public expectedStart: number,
		public expectedEnd: number,
		public segments: RundownSegment[] = []
	) {}

	serialize (): IRundown {
		return {
			externalId:				this.externalId,
			name:			this.name,
			expectedStart:	this.expectedStart,
			expectedEnd:	this.expectedEnd
		}
	}
	addSegments (segments: RundownSegment[]) {
		segments.forEach(segment => this.segments.push(segment))
	}

	private static parseRawData (rundownNSML: any[], outputLayers: IOutputLayer[]): {elements: IParsedElement[], meta: IRundownMetaData} {

		console.log('DUMMY LOG : ', outputLayers)
		let elements: IParsedElement[] = rundownNSML.map((story) => {
			const convertedStory = NsmlToJson.convert(story)
			console.log('DUMMY LOG : ', convertedStory)

			let dummy = ''
			switch (dummy) {
				case 'id':
				case 'name':
				case 'type':
				case 'float':
				case 'script':
				case 'objectType':
				case 'objectTime':
				case 'duration':
				case 'clipName':
				case 'feedback':
				case 'transition':
					break
				case 'screen':
					break
				case '':
				case undefined:
					break
				default:
					break
			}
			return ({
				meta: {
					rowPosition: 3,
					propColPosition: {
						['string']: 0
					}
				},
				data: {
					id: convertedStory.head.storyid[0],
					name: convertedStory.head.formname[0],
					type: 'string',
					float: 'string',
					script: 'string',
					objectType: 'string',
					objectTime: 'string',
					duration: 'string',
					clipName: 'string',
					feedback: 'string',
					transition: 'string',
					attributes: { ['string']: 'string' }
				}
			})
		})

		return {
			meta: {
				version: 'v0.2',
				startTime: 0,
				endTime: 1
			},
			elements: elements
		}
	}

	static columnToLetter (columnOneIndexed: number): string {
		let temp: number | undefined
		let letter = ''
		while (columnOneIndexed > 0) {
			temp = (columnOneIndexed - 1) % 26
			letter = String.fromCharCode(temp + 65) + letter
			columnOneIndexed = (columnOneIndexed - temp - 1) / 26
		}
		return letter
	}

	private static parsedRowsIntoSegments (sheetId: string, parsedRows: IParsedElement[]): {segments: RundownSegment[], sheetUpdates: IRundownUpdate[]} {
		let segments: RundownSegment[] = []
		const implicitId = 'implicitFirst'
		let segment = new RundownSegment(sheetId,implicitId, 0,'Implicit First Section', false)
		let part: IRundownPart | undefined
		let sheetUpdates: IRundownUpdate[] = []

		function timeFromRawData (time: string | undefined): number {
			if (time === undefined) {
				return 0
			}

			time = time.replace('\n', '').replace(/\s/g, '')

			let parts: string[] = []

			if (time.match(/^(\d{1,2}){1,2}([\.:]\d{1,2}){0,2}$/)) {
				if (time.indexOf(':') !== -1) {
					parts = time.split(':')
				} else {
					parts = time.split('.')
				}
			} else if (time.match(/^(\d{1,2}){0,2}(\.\d{1,2}){0,2}(:(\d{1,3}))?$/)) {
				if (time.indexOf(':') !== -1) {
					let t = time.split(':')
					time = t[0].replace('.', ':')
					time += '.' + t[1]
				}
				parts = time.split(':')
			} else {
				return 0
			}

			parts = parts.reverse()

			let ml = 1000

			let multipliers: number[] = [ml, ml * 60, ml * 3600]
			let duration = 0

			for (let i = 0; i < parts.length; i++) {
				if (i === 0) {
					if (parts[i].includes('.')) {
						duration += Number(parts[i].split('.')[1])
						duration += Number(parts[i].split('.')[0]) * multipliers[i]
					} else {
						duration += Number(parts[i]) * multipliers[i]
					}
				} else {
					duration += Number(parts[i]) * multipliers[i]
				}
			}

			return duration
		}

		function isAdlib (time: string | undefined): boolean {
			if (!time) {
				return true
			}

			return false
		}

		parsedRows.forEach(row => {
			let id = row.data.id
			let currentSheetUpdate: IRundownUpdate | undefined
			if (!id) {
				id = uuidV4()
				// Update sheet with new ids
				let rowPosition = row.meta.rowPosition + 1
				let colPosition = this.columnToLetter(row.meta.propColPosition['id'] + 1)

				currentSheetUpdate = {
					value: id,
					cellPosition: colPosition + rowPosition
				}
			}
			switch (row.data.type) {
				case 'SECTION':
					if (part) {
						segment.addPart(part)
						part = undefined
					}
					if (!(segment.externalId === implicitId && _.keys(segment.parts).length === 0)) {
						segments.push(segment)
					}

					segment = new RundownSegment(sheetId, id, segments.length, row.data.name || '', row.data.float === 'TRUE')
					break
				case '':
				case undefined:
					// This is an item only, not a story even. Usually "graphics" or "video"
					if (!part) {
						// Then what?!
						currentSheetUpdate = undefined
					} else {
						if (row.data.objectType) {
							let attr = { ...row.data.attributes || {}, ...{ adlib: isAdlib(row.data.objectTime).toString() } }
							part.addPiece(new RundownPiece(id, row.data.objectType, timeFromRawData(row.data.objectTime), timeFromRawData(row.data.duration), row.data.clipName || '', attr, 'TBA', row.data.script || '', row.data.transition || ''))
						} else {
							currentSheetUpdate = undefined
						}
					}
					break
				case 'SPLIT':
					// Not sure what to do there
					// For now; assuming this is a type of story
					// break;
				default:
					// It is likely a story
					if (part) {
						// We already have a story. We should add it to the section.
						segment.addPart(part)
						part = undefined
					}
					part = new IRundownPart(row.data.type, segment.externalId, id, _.keys(segment.parts).length, row.data.name || '', row.data.float === 'TRUE', row.data.script || '')
					if (row.data.objectType) {
						let attr = { ...row.data.attributes || {}, ...{ adlib: isAdlib(row.data.objectTime).toString() } }
						const firstItem = new RundownPiece(id + '_item', row.data.objectType, timeFromRawData(row.data.objectTime), timeFromRawData(row.data.duration), row.data.clipName || '', attr, 'TBA', '', row.data.transition || '')
						part.addPiece(firstItem)
					}
					// TODO: ID issue. We can probably do "id + `_item`, or some shit"
					break
			}
			if (currentSheetUpdate) {
				// console.log('creating a new id for row', currentSheetUpdate.value)
				// console.log(row)

				sheetUpdates.push(currentSheetUpdate)
			}
		})

		if (part) {
			segment.addPart(part)
		}
		segments.push(segment)
		return { segments: segments, sheetUpdates }
	}
	/**
	 *  KEEEP THIS EXPLANATION UNTIL TRANSFORMING INTO INEWS IS COMPLETED
	 * Data attributes
	 *
	 * Row 1: Meta data about the running order;
	 *  A1: iNews gateway version
	 *  C1: Expected start
	 *  E1: Expected end
	 * Row 2: table names
	 *  Should have one of each of id, name, type, float, script, objectType, objectTime, , duration, clipName, feedback
	 *  Can have 0 to N of "attr: X" Where x can be any alphanumerical value eg. "attr: name"
	 * Row 3: Human readable information. Ignored
	 * Row 4: Start of row-items. Normally Row 4 will be a SECTION. If not a SECTION, a "section 1" is assumed.
	 * All following rows is one of the possible row types.
	 */

	 /**
	  *
	  * @param sheetId Id of the sheet
	  * @param name Name of the sheet (often the title)
	  * @param rundownNSML Cells of the sheet
	  * @param sheetManager Optional; Will be used to update the sheet if changes, such as ID-updates, needs to be done.
	  */
	static fromNSMLdata (sheetId: string, name: string, rundownNSML: any[][], outputLayers: IOutputLayer[], sheetManager?: RundownManager): InewsRundown {
		console.log('DUMMY LOG : ' + sheetManager)
		let parsedData = InewsRundown.parseRawData(rundownNSML, outputLayers)
		let rundown = new InewsRundown(sheetId, name, parsedData.meta.version, parsedData.meta.startTime, parsedData.meta.endTime)
		let results = InewsRundown.parsedRowsIntoSegments(sheetId, parsedData.elements)
		rundown.addSegments(results.segments)

		return rundown
	}
}
