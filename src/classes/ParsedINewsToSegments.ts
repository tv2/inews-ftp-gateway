import { RundownSegment, INewsStoryGW } from './datastructures/Segment'
import { createHash } from 'crypto'

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

	static parse (sheetId: string, inewsRaw: INewsStoryGW[]): RundownSegment[] {
		let segments: RundownSegment[] = []

		for (let x = 0 ; x < inewsRaw.length ; x++) {
			let story = inewsRaw[x]
			let md5 = createHash('md5')
			let segment = new RundownSegment(
				sheetId,
				story,
				story.fields.modifyDate,
				story.id || md5.update(sheetId + inewsRaw[x].fileId).digest('hex'),
				x,
				story.fields.title || '',
				false
			)
			segments.push(segment)
		}
		return segments
	}

}
