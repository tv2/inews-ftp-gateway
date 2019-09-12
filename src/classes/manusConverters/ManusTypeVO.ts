import { IParsedElement } from '../ParsedElementsToSegments'

export class ManusTypeVO {

	static convert (story: any, script: string, index: number): IParsedElement[] {

		let elements: IParsedElement[] = []

		elements.push({
			data: {
				id: story.id + 'camera' + index,
				name: story.fields.titel,
				type: 'CAM',
				float: 'false',
				script: script,
				objectType: 'camera',
				objectTime: '0',
				duration: story.fields.audioTime,
				clipName: 'string',
				feedback: 'string',
				transition: 'string',
				attributes: { 'name': 'kam1' }
			}
		})

		return elements
	}
}
