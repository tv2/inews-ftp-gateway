
export interface INewsFields {
	pageNumber?: string,
	title?: string,
	var2?: string,
	var3?: string,
	videoId?: number,
	tapeTime?: number,
	audioTime?: number,
	totalTime?: number,
	modifyDate?: number,
	presenter?: string,
	modifyBy?: string,
	var16?: string,
	ready?: string,
	runsTime?: number,
	onair?: string,
	typecode?: string,
	programtitle?: string,
	noarchive?: string,
	starttid?: string,
	layout?: string,
	airDate?: number
}

export interface INewsStory {
	id: string,
	fileId: string,
	fields: INewsFields,
	cues: Array<string[]>,
	body: string,
	meta: {
		words: number,
		rate: number,
		float?: 'float'
	}
}

export interface ISegment {
	rundownId: string
	iNewsStory?: INewsStory
	modified: string
	externalId: string // unique within the parent runningOrder
	rank: number
	name: string
	float: boolean
}

export class RundownSegment implements ISegment {
	constructor (
		public rundownId: string,
		public modified: string,
		public externalId: string,
		public rank: number,
		public name: string,
		public float: boolean,
		public iNewsStory?: INewsStory
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
