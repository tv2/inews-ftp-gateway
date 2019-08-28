import { IPiece, RundownPiece } from './Piece'
// import { hasChangeType } from './hasChangeType';

export interface IPart {
	segmentId: string
	externalId: string // unique within the parent section
	rank: number
	name: string
	type: string //  Assume we want this
	// type: string
	float: boolean
	script: string

	pieces: IPiece[]
}

export class RundownPart implements IPart {

	constructor (
		public type: string,
		public segmentId: string,
		public externalId: string, // unique within the parent section
		public rank: number,
		public name: string,
		public float: boolean,
		public script: string,
		public pieces: RundownPiece[] = []) { }

	serialize () {
		return {
			type: 				this.type,
			segmentId: 			this.segmentId,
			id: 					this.externalId,
			rank: 				this.rank,
			name: 				this.name,
			float: 				this.float,
			script: 				this.script,
			pieces: 				this.pieces
		}
	}
	addPieces (piece: RundownPiece[]) {
		this.pieces = this.pieces.concat(piece)
	}
	addPiece (piece: RundownPiece) {
		this.pieces.push(piece)
	}
}
