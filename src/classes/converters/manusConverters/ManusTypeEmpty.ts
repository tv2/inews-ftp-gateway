import { IParsedElement } from '../../Rundown'
import { IAeCodes } from '../AeCodesToJs'

export class ManusTypeEmpty {

	static convert (convertedStory: any, script: string, aeCodes: IAeCodes[]): IParsedElement[] {
		console.log('DUMMY LOG :', aeCodes)

		let elements: IParsedElement[] = []
		const f = convertedStory.root.story[0].fields[0].f

		let name = f[f.findIndex((x: any) => x.id[0] === 'title')]._
		elements.push({
			data: {
				id: convertedStory.root.head[0].storyid + 'camera',
				name: name,
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

		return elements
	}
}
