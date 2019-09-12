export interface IPiece {
	id: string
	objectType: string
	duration: number
	clipName: string
	script?: string
}

export class RundownPiece implements IPiece {
	constructor (
		public id: string,
		public objectType: string,
		public duration: number,
		public clipName: string,
		public position: string,
		public script?: string
	) { }
}
