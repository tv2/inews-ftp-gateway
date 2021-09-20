import { RundownSegment } from './Segment'

export interface IRundown {
	externalId: string
	name: string
	backTime: string | undefined
}

export class INewsRundown implements IRundown {
	constructor(
		public externalId: string,
		public name: string,
		public gatewayVersion: string,
		public segments: RundownSegment[] = [],
		public backTime: string | undefined
	) {}

	serialize(): IRundown {
		return {
			externalId: this.externalId,
			name: this.name,
			backTime: this.backTime,
		}
	}

	addSegments(segments: RundownSegment[]) {
		segments.forEach((segment) => {
			this.segments.push(segment)
		})
	}
}
