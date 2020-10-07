import { INewsStory } from 'inews'

export type INewsStoryGW = {
	fileId: string // Added by RundownManager - not from underlying library
	error?: string // Error message associated with failed retrieval of story
} & INewsStory

export interface ISegment {
	rundownId: string
	iNewsStory: INewsStoryGW
	modified: string
	externalId: string // unique within the parent rundown
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
