export interface IPiece {
	id: string
	objectType: string
	objectTime: number
	duration: number
	clipName: string
	attributes: {
		[key: string]: string
	},
	script?: string,
	transition?: string
}

export class RundownPiece implements IPiece {
	constructor (
		public id: string,
		public objectType: string,
		public objectTime: number,
		public duration: number,
		public clipName: string,
		public attributes: {
			[key: string]: string
		},
		public position: string,
		public script?: string,
		public transition?: string
	) { }
}
