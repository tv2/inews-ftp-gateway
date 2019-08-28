import { IOutputLayer } from 'tv-automation-sofie-blueprints-integration'
import { IParsedElement } from './Rundown'
import { NsmlToJS } from './converters/NsmlToJs'
import { IAeCodes, AeCodes } from './converters/AeCodesToJs'
import { BodyCodes, ELEMENT_CODE_TYPES } from './converters/BodyCodesToJs'
import { ManusTypeServer } from './manusConverters/ManusTypeServer'
import { ManusTypeKam } from './manusConverters/ManusTypeKam'
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
			let { elementCodes, script } = BodyCodes.extract(convertedStory.root.story[0].body)

			// Extract AE codes from aesets:
			const aeCodes: IAeCodes[] = AeCodes.extract(convertedStory.root.story[0].aeset)

			// Loop through pi codes ('KAM' 'SERVER' 'VO' etc.):
			elementCodes.map((code) => {
				switch (code.elementCommand) {
					case ELEMENT_CODE_TYPES[0]: // KAM
						allElements.push(...ManusTypeKam.convert(convertedStory, script, aeCodes))
						break
					case ELEMENT_CODE_TYPES[1]: // SERVER
						allElements.push(...ManusTypeServer.convert(convertedStory, script, aeCodes))
						break
					case ELEMENT_CODE_TYPES[2]: // VO
						allElements.push(...ManusTypeEmpty.convert(convertedStory, 'VO type Not Implemented', aeCodes))
						break
					case ELEMENT_CODE_TYPES[3]: // VOSB
						allElements.push(...ManusTypeEmpty.convert(convertedStory, 'VOSB type Not Implemented', aeCodes))
						break
					case ELEMENT_CODE_TYPES[4]: // ATTACK
						allElements.push(...ManusTypeServer.convert(convertedStory, 'ATTACK type Not Implemented', aeCodes))
						break
					case 'undefined':
						console.log('DUMMY LOG')
						break
					default:
						allElements.push(...ManusTypeEmpty.convert(convertedStory, 'Unknown Manus Type', aeCodes))

				}
			})
			if (elementCodes.length === 0) {
				allElements.push(...ManusTypeEmpty.convert(convertedStory, 'Manus Segment Not Implemented', aeCodes))
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