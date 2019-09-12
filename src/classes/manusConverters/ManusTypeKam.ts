import { IParsedElement } from '../ParsedElementsToSegments'

export class ManusTypeKam {

	static convert (story: any, script: string, index: number): IParsedElement[] {

		let elements: IParsedElement[] = []

		elements.push({
			data: {
				id: story.id + 'camera' + index,
				name: story.fields.title,
				type: 'CAM',
				float: 'false',
				script: script,
				objectType: 'camera',
				duration: story.fields.audioTime,
				clipName: 'string'
			}
		})

		return elements
	}
}
