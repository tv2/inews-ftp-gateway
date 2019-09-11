import { IOutputLayer } from 'tv-automation-sofie-blueprints-integration'
import { IParsedElement } from './ParsedElementsToSegments'
import { BodyCodes } from './converters/BodyCodesToJS'
import * as Winston from 'winston'

interface IRundownMetaData {
	version: string
	startTime: number
	endTime: number
}

export class SplitRawDataToElements {

	static convert (_logger: Winston.LoggerInstance, rundownRaw: any[], outputLayers: IOutputLayer[]): {elements: IParsedElement[], meta: IRundownMetaData} {

		console.log('DUMMY LOG : ', outputLayers)
		let allElements: IParsedElement[] = []
		rundownRaw.forEach((root): void => {
			_logger.info(' Converting : ', root.storyName)
			const story = root.story

// THESE ARE THE EXTRACTED BODY CODES AND THE SCRIPT:
// DONT KNOW IF IT SHOULD BE DONE HERE OR IN THE BLUEPRINTS

			let { elementCodes, script } = BodyCodes.extract(story.body)
			console.log('DUMMY LOG : ' + elementCodes + ' ' + script)

			// New section for each iNews form:
			allElements.push({
				data: {
					id: story.id,
					name: story.fields.title,
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
