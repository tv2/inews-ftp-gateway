import { INewsStory } from '@johnsand/inews'

export interface INewsStoryGW extends INewsStory {
	fileId: string // Added by RundownManager - not from underlying library
	error?: string // Error message associated with failed retrieval of story
}

export interface ISegment {
	rundownId: string
	iNewsStory: INewsStoryGW
	modified: string
	externalId: string // unique within the parent runningOrder
	rank: number
	name: string
	float: boolean
}

export class RundownSegment implements ISegment {
	constructor (
		public rundownId: string,
		public iNewsStory: INewsStoryGW,
		public modified: string,
		public externalId: string,
		public rank: number,
		public name: string,
		public float: boolean
	) {}

	serialize (): ISegment {
		return {
			rundownId:		this.rundownId,
			iNewsStory: 	this.iNewsStory,
			modified:		this.modified,
			externalId:		this.externalId,
			rank:				this.rank,
			name:				this.name,
			float:				this.float
		}
	}
}
