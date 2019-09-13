import { RundownPart } from './datastructures/Part'
import { RundownPiece } from './datastructures/Piece'
import { RundownSegment } from './datastructures/Segment'
import * as _ from 'underscore'
import { ICue, IBodyCodes } from './converters/SplitRawDataToElements'

export interface IParsedElement {
	data: {
		id?: string
		name?: string
		type?: string
		float: string
		script?: string
		objectType?: string
		duration?: string
		clipName?: string
	}
}
export class ParsedElementsIntoSegments {

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

	static parse (sheetId: string, parsedForms: IParsedElement[], fields: any, bodyCodes: IBodyCodes[], cues: ICue[]): RundownSegment[] {
		let segments: RundownSegment[] = []
		const implicitId = 'implicitFirst'
		let segment = new RundownSegment(sheetId, implicitId, 0, 'Implicit Section', false, fields, bodyCodes, cues)
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

					segment = new RundownSegment(sheetId, id, segments.length, form.data.name || '', form.data.float === 'TRUE', fields, bodyCodes, cues)
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
						const firstItem = new RundownPiece(id + '_item', form.data.objectType, ParsedElementsIntoSegments.timeFromRawData(form.data.duration), form.data.clipName || '', 'TBA', '')
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

}
