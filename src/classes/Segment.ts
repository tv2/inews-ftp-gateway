import { IRundownPart } from './Part'
// import { hasChangeType } from './hasChangeType';
export interface Segment {
	rundownId: string
	externalId: string // unique within the parent runningOrder
	rank: number
	name: string
	float: boolean
}

export class SheetSegment implements Segment {
	constructor (
		public rundownId: string,
		public externalId: string,
		public rank: number,
		public name: string,
		public float: boolean,
		public parts: IRundownPart[] = []
	) {}
	serialize (): Segment {
		return {
			rundownId:		this.rundownId,
			externalId:					this.externalId,
			rank:				this.rank,
			name:				this.name,
			float:				this.float
		}
	}
	addPart (part: IRundownPart) {
		this.parts.push(part)
	}
	addParts (parts: IRundownPart[]) {
		parts.forEach(story => this.addPart(story))
	}
}
