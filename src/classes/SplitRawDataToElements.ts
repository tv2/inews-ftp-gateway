import { IOutputLayer } from 'tv-automation-sofie-blueprints-integration'
import { IParsedElement } from './Rundown'
import { NsmlToJS } from './NsmlToJson'
import { ManusTypeIndsl } from './manusConverters/ManusTypeIndsl'
import { ManusTypeEmpty } from './manusConverters/ManusTypeEmpty'

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
			const f = convertedStory.root.story[0].fields[0].f

			// New section for each iNews form:
			allElements.push({
				data: {
					id: convertedStory.root.head[0].storyid,
					name: f[f.findIndex((x: any) => x.id[0] === 'title')]._,
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

			// Check Form type:
			if (f[f.findIndex((x: any) => x.id[0] === 'var-2')]._ === 'INDSL') {
				allElements.push(...ManusTypeIndsl.convert(convertedStory, script))
			} else {
				allElements.push(...ManusTypeEmpty.convert(convertedStory, script))
			}

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
