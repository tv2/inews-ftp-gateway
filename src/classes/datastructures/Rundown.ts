import { RundownSegment } from './Segment'

export interface IRundown {
	externalId: string
	name: string // namnet på sheeten
}

export class INewsRundown implements IRundown {
	constructor (
		public externalId: string,
		public name: string,
		public gatewayVersion: string,
		public segments: RundownSegment[] = []
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
