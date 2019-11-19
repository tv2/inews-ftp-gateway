import { RundownSegment } from './Segment'

export interface IRundown {
	externalId: string
	name: string // namnet på sheeten
}

export class InewsRundown implements IRundown {
	// id: string
	// name: string // namnet på sheeten
	// sections: Section[] = []
	constructor (
		public externalId: string,
		public name: string,
		public gatewayVersion: string,
		public segments: RundownSegment[] = [] // REFACTOR - invariant ... uniqueness of segment by id?
	) {}

	serialize (): IRundown {
		return {
			externalId:		this.externalId,
			name:			this.name
		}
	}

	addSegments (segments: RundownSegment[]) {
		segments.forEach(segment => { this.segments.push(segment) })
	}
}
