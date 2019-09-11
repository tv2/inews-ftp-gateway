import { IOutputLayer } from 'tv-automation-sofie-blueprints-integration'
import { IParsedElement } from '../ParsedElementsToSegments'
import { BodyCodes } from './BodyCodesToJS'
import * as Winston from 'winston'

import {
	ManusTypeServer,
	ManusTypeEmpty,
	ManusTypeKam,
	ELEMENT_CODE_TYPES
} from '../manusConverters/ManusIndex'

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

// A MORE FLEXIBLE MANUSCODE <-> FUNCTION HANDLER SHOULD BE MADE
// Maybe a [{ commandName: 'KAM', functionName: 'ManusTypeKam' }] etc.
// Feel free to rename and change for whats best
			elementCodes.forEach((code, index) => {
				if (code.includes(ELEMENT_CODE_TYPES[0])) { // KAM
					allElements.push(...ManusTypeKam.convert(story, script,index))
				} else if (code.includes(ELEMENT_CODE_TYPES[1])) { // SERVER
					allElements.push(...ManusTypeServer.convert(story, script, index))
				} else if (code.includes(ELEMENT_CODE_TYPES[2])) { // VO
					allElements.push(...ManusTypeEmpty.convert(story, 'VO type Not Implemented', index))
				} else if (code.includes(ELEMENT_CODE_TYPES[3])) { // VOSB
					allElements.push(...ManusTypeEmpty.convert(story, 'VOSB type Not Implemented', index))
				} else if (code.includes(ELEMENT_CODE_TYPES[4])) { // ATTACK
					allElements.push(...ManusTypeServer.convert(story, 'ATTACK type Not Implemented', index))
				} else {
					allElements.push(...ManusTypeEmpty.convert(story, 'Unknown Manus Type', index))
				}
			})
			if (elementCodes.length === 0) {
				allElements.push(...ManusTypeEmpty.convert(story, 'Manus Segment Not Implemented', 0))
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
