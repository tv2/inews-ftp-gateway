import { INewsStory } from 'inews'

export type INewsStoryGW = INewsStory

export interface ISegment {
	rundownId: string
	iNewsStory: INewsStoryGW
	modified: Date
	// Changes whenever a story is modified
	locator: string
	externalId: string // unique within the parent rundown
	rank: number
	name: string
	float: boolean
	untimed: boolean
	/**
	 * Not every story from iNews will specify a segmentType.
	 * In that case, we apply the last-known segmentType.
	 * It is technically possible for a malformed iNews rundown to not always provide a calculable value for this,
	 * so we allow undefined to account for that possibility.
	 */
	segmentType: string | undefined
}

export class RundownSegment implements ISegment {
	public float: boolean

	constructor(
		public rundownId: string,
		public iNewsStory: INewsStoryGW,
		public modified: Date,
		public locator: string,
		public externalId: string,
		public rank: number,
		public name: string,
		public untimed: boolean,
		public segmentType: string | undefined
	) {
		this.float = iNewsStory.meta.float === 'float'
	}

	serialize(): Omit<ISegment, 'modified' | 'locator' | 'rank'> {
		return {
			rundownId: this.rundownId,
			iNewsStory: {
				...this.iNewsStory,
				fields: { ...this.iNewsStory.fields, modifyDate: '' },
				identifier: '',
				id: '',
				locator: '',
			},
			externalId: this.externalId,
			name: this.name,
			float: this.float,
			untimed: this.untimed,
			segmentType: this.segmentType,
		}
	}
}
