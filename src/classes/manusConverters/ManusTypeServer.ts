import { IParsedElement } from '../Rundown'

export class ManusTypeServer {

	static convert (convertedStory: any, script: string): IParsedElement[] {
		let elements: IParsedElement[] = []

		elements.push({
			data: {
				id: convertedStory.root.head[0].storyid + 'camera',
				name: convertedStory.root.story[0].fields[0].f[2]._,
				type: 'CAM',
				float: 'false',
				script: script,
				objectType: 'camera',
				objectTime: '0',
				duration: '10',
				clipName: 'string',
				feedback: 'string',
				transition: 'string',
				attributes: { ['Name']: 'CAM1' }
			}
		})

		elements.push({
			data: {
				id: convertedStory.root.head[0].storyid + 'video',
				name: convertedStory.root.story[0].fields[0].f[2]._,
				type: 'HEAD',
				float: 'false',
				script: '',
				objectType: 'video',
				objectTime: '0',
				duration: '10',
				clipName: 'ID from iNews',
				feedback: 'string',
				transition: 'string',
				attributes: { ['Name']: 'CAM2' }
			}
		})

		return elements
	}
}
