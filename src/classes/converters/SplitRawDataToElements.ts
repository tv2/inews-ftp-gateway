import { IOutputLayer } from 'tv-automation-sofie-blueprints-integration'
import { IParsedElement } from '../Rundown'
import { NsmlToJS } from './NsmlToJs'
import { IAeCodes, AeCodes } from './AeCodesToJs'
import { BodyCodes, PI_CODE_TYPES } from './BodyCodesToJs'
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

			// Extract body object to piCodes[] and script:
			let { piCodes, script } = BodyCodes.extract(convertedStory.root.story[0].body)

			// Extract AE codes from aesets:
			const aeCodes: IAeCodes[] = AeCodes.extract(convertedStory.root.story[0].aeset)

			// Loop through pi codes ('KAM' 'SERVER' 'VO' etc.):
			piCodes.map((code) => {
				switch (code.piCommand) {
					case PI_CODE_TYPES[0]: // KAM
						allElements.push(...ManusTypeIndsl.convert(convertedStory, script, aeCodes))
						break
					case PI_CODE_TYPES[1]: // SERVER
						allElements.push(...ManusTypeIndsl.convert(convertedStory, script, aeCodes))
						break
					case PI_CODE_TYPES[2]: // VO
						allElements.push(...ManusTypeIndsl.convert(convertedStory, script, aeCodes))
						break
					case PI_CODE_TYPES[3]: // VOSB
						allElements.push(...ManusTypeIndsl.convert(convertedStory, script, aeCodes))
						break
					case PI_CODE_TYPES[4]: // ATTACK
						allElements.push(...ManusTypeIndsl.convert(convertedStory, script, aeCodes))
						break
					default:
						allElements.push(...ManusTypeEmpty.convert(convertedStory, script, aeCodes))
				}
			})
			if (piCodes.length === 0) {
				allElements.push(...ManusTypeEmpty.convert(convertedStory, script, aeCodes))
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
