import { IParsedElement } from '../ParsedElementsToSegments'
import { IAeCodes } from '../converters/AeCodesToJs'

export class ManusTypeEmpty {

	static convert (convertedStory: any, script: string, aeCodes: IAeCodes[]): IParsedElement[] {
		console.log('DUMMY LOG :', aeCodes)

		let elements: IParsedElement[] = []
		const f = convertedStory.root.story[0].fields[0].f
		// let audioTime = f[f.findIndex((x: any) => x.id[0] === 'audio-time')]._ || '0'

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
				duration: '10', /* audioTime, */
				clipName: 'stringManusEmpty',
				feedback: 'string',
				transition: 'string',
				attributes: { ['Name']: 'CAM1' }
			}
		})

		return elements
	}
}
