import { IParsedElement } from '../ParsedElementsToSegments'

export class ManusTypeServer {

	static convert (story: any, script: string, index: number): IParsedElement[] {
		console.log('DUMMY LOG :', script)

		let elements: IParsedElement[] = []

		elements.push({
			data: {
				id: story.id + 'video' + index,
				name: story.fields.title,
				type: 'HEAD',
				float: 'false',
				script: '',
				objectType: 'video',
				objectTime: '0',
				duration: story.fields.tapeTime,
				clipName: story.fields.videoId,
				feedback: 'string',
				transition: 'string',
				attributes: { 'name': 'kam2' }
			}
		})

		return elements
	}
}
