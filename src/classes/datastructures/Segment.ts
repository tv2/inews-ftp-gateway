import { RundownPart } from './Part'
import { IBodyCodes } from '../converters/BodyCodesToJS'
import { cues } from '../converters/SplitRawDataToElements'

export interface ISegment {
	rundownId: string
	externalId: string // unique within the parent runningOrder
	rank: number
	name: string
	float: boolean
}

export class RundownSegment implements ISegment {
	constructor (
		public rundownId: string,
		public externalId: string,
		public rank: number,
		public name: string,
		public float: boolean,
		public fields: any,
		public bodyCodes: IBodyCodes[],
		public cues: cues,
		public parts: RundownPart[] = []
	) {}
	serialize (): ISegment {
		return {
			rundownId:		this.rundownId,
			externalId:					this.externalId,
			rank:				this.rank,
			name:				this.name,
			float:				this.float
		}
	}
	addPart (part: RundownPart) {
		this.parts.push(part)
	}
	addParts (parts: RundownPart[]) {
		parts.forEach(story => this.addPart(story))
	}
}
