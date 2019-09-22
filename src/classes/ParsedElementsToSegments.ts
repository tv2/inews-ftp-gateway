import { RundownSegment } from './datastructures/Segment'
import * as _ from 'underscore'

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

	static parse (sheetId: string, inewsRaw: any[]): RundownSegment[] {
		let segments: RundownSegment[] = []

		inewsRaw.forEach(story => {
			let segment = new RundownSegment(sheetId, story.data.id || '', segments.length, story.data.name || '', story.data.float === 'TRUE')
			segments.push(segment)
		})
		return segments
	}

}
