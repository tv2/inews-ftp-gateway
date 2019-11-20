import { RundownSegment } from './datastructures/Segment'
import { INewsStory } from '@johnsand/inews'

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
export class ParsedINewsIntoSegments {

	static parse (sheetId: string, inewsRaw: INewsStory[]): RundownSegment[] {
		let segments: RundownSegment[] = []

		for (let x = 0 ; x < inewsRaw.length ; x++) {
			let story = inewsRaw[x]
			let segment = new RundownSegment(
				sheetId,
				story,
				story.fields.modifyDate,
				story.id || '',
				x,
				story.fields.title || '',
				false
			)
			segments.push(segment)
		}
		return segments
	}

}
