import { RundownSegment } from './Segment'
import { RundownPart } from './Part'
import { RundownPiece } from './Piece'
import { RundownManager } from './RundownManager'
import * as _ from 'underscore'
import { IOutputLayer } from 'tv-automation-sofie-blueprints-integration'
import { SplitRawDataToElements } from './SplitRawDataToElements'

export interface IParsedElement {
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

	static timeFromRawData (time: string | undefined): number {
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

	static isAdlib (time: string | undefined): boolean {
		if (!time) {
			return true
		}

		return false
	}

	private static parsedElementsIntoSegments (sheetId: string, parsedForms: IParsedElement[]): RundownSegment[] {
		let segments: RundownSegment[] = []
		const implicitId = 'implicitFirst'
		let segment = new RundownSegment(sheetId,implicitId, 0,'Implicit Section', false)
		let part: RundownPart | undefined

		parsedForms.forEach(form => {
			let id = form.data.id || ''

			switch (form.data.type) {
				case 'SECTION':
					if (part) {
						segment.addPart(part)
						part = undefined
					}
					if (!(segment.externalId === implicitId && _.keys(segment.parts).length === 0)) {
						segments.push(segment)
					}

					segment = new RundownSegment(sheetId, id, segments.length, form.data.name || '', form.data.float === 'TRUE')
					break
				case undefined:
					// This is an item only, not a story even. Usually "graphics" or "video"
					if (!part) {
						// Then what?!
					}
					break
				default:
					// It is likely a story
					if (part) {
						// We already have a story. We should add it to the section.
						segment.addPart(part)
						part = undefined
					}
					part = new RundownPart(form.data.type, segment.externalId, id, _.keys(segment.parts).length, form.data.name || '', form.data.float === 'TRUE', form.data.script || '')
					if (form.data.objectType) {
						let attr = { ...form.data.attributes || {}, ...{ adlib: InewsRundown.isAdlib(form.data.objectTime).toString() } }
						const firstItem = new RundownPiece(id + '_item', form.data.objectType, InewsRundown.timeFromRawData(form.data.objectTime), InewsRundown.timeFromRawData(form.data.duration), form.data.clipName || '', attr, 'TBA', '', form.data.transition || '')
						part.addPiece(firstItem)
					}
					break
			}
		})

		if (part) {
			segment.addPart(part)
		}
		segments.push(segment)
		return segments
	}

	/**
	 *
	 * @param sheetId Id of the sheet
	 * @param name Name of the sheet (often the title)
	 * @param rundownNSML Cells of the sheet
	 * @param sheetManager Optional; Will be used to update the sheet if changes, such as ID-updates, needs to be done.
	 */
	static fromNSMLdata (sheetId: string, name: string, rundownNSML: any[][], outputLayers: IOutputLayer[], sheetManager?: RundownManager): InewsRundown {
		console.log('DUMMY LOG : ' + sheetManager)
		let parsedData = SplitRawDataToElements.convert(rundownNSML, outputLayers)
		let rundown = new InewsRundown(sheetId, name, parsedData.meta.version, parsedData.meta.startTime, parsedData.meta.endTime)
		let segments = InewsRundown.parsedElementsIntoSegments(sheetId, parsedData.elements)
		rundown.addSegments(segments)

		return rundown
	}
}
