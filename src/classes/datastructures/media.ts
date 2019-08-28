export interface IMediaDict {
	[id: string]: IMediaInfo
}

export interface IMediaInfo {
	name: string
	path: string
	duration: string
}

