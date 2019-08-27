import { IOutputLayer } from 'tv-automation-sofie-blueprints-integration'
import { IParsedElement } from './Rundown'
import { NsmlToJS } from './NsmlToJson'
import { ManusTypeServer } from './manusConverters/ManusTypeServer'

interface IRundownMetaData {
	version: string
	startTime: number
	endTime: number
}

export class SplitRawDataToElements {

	static convert (rundownNSML: any[], outputLayers: IOutputLayer[]): {elements: IParsedElement[], meta: IRundownMetaData} {

		console.log('DUMMY LOG : ', outputLayers)
		let allElements: IParsedElement[] = []
		rundownNSML.map((story): void => {
			const convertedStory = NsmlToJS.convert(story)

			// New section for each iNews form:
			allElements.push({
				data: {
					id: convertedStory.root.head[0].storyid,
					name: convertedStory.root.story[0].fields[0].f[2]._,
					type: 'SECTION',
					float: 'string',
					script: 'string',
					objectType: 'string',
					objectTime: 'string',
					duration: 'string',
					clipName: 'string',
					feedback: 'string',
					transition: 'string',
					attributes: { ['string']: 'string' }
				}
			})

			// Convert body object to script:
			let script = ''
			convertedStory.root.story[0].body[0].p.map((line: any) => {
				if (typeof(line) === 'string') {
					script = script + line + '\n'
				}
			})

			// If Form type is *** SERVER ***
			allElements.push(...ManusTypeServer.convert(convertedStory, script))

		})

		return {
			meta: {
				version: 'v0.2',
				startTime: 0,
				endTime: 1
			},
			elements: allElements
		}
	}

}
