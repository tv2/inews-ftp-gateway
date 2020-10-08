import { INewsStory } from 'inews'

export type INewsStoryGW = INewsStory

export interface ISegment {
	rundownId: string
	iNewsStory: INewsStoryGW
	modified: Date
	externalId: string // unique within the parent rundown
	rank: number
	name: string
	float: boolean
}

export class RundownSegment implements ISegment {
	public float: boolean

	constructor (
		public rundownId: string,
		public iNewsStory: INewsStoryGW,
		public modified: Date,
		public externalId: string,
		public rank: number,
		public name: string
	) {
		this.float = iNewsStory.meta.float === 'float'
	}

	serialize (): Omit<ISegment, 'modified'> {
		return {
			rundownId:		this.rundownId,
			iNewsStory: 	this.iNewsStory,
			externalId:		this.externalId,
			rank:				this.rank,
			name:				this.name,
			float:				this.float
		}
	}
}
