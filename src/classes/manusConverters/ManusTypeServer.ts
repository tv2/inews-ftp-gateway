import { IParsedElement } from '../Rundown'
import { IAeCodes } from '../converters/AeCodesToJs'

export class ManusTypeServer {

	static convert (convertedStory: any, script: string, aeCodes: IAeCodes[]): IParsedElement[] {
		console.log('DUMMY LOG :', aeCodes, script)

		let elements: IParsedElement[] = []
		const f = convertedStory.root.story[0].fields[0].f

		let name = f[f.findIndex((x: any) => x.id[0] === 'title')]._
		let videoID = f[f.findIndex((x: any) => x.id[0] === 'video-id')]._ || ''
		let tapeTime = f[f.findIndex((x: any) => x.id[0] === 'tape-time')]._ || '0'

		elements.push({
			data: {
				id: convertedStory.root.head[0].storyid + 'video',
				name: name,
				type: 'HEAD',
				float: 'false',
				script: '',
				objectType: 'video',
				objectTime: '0',
				duration: tapeTime,
				clipName: videoID,
				feedback: 'string',
				transition: 'string',
				attributes: { ['Name']: 'CAM2' }
			}
		})

		return elements
	}
}