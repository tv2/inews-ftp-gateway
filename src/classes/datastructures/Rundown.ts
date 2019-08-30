import { RundownSegment } from './Segment'
import * as _ from 'underscore'

export interface IParsedElement {
	data: {
		id?: string
		name?: string
		type?: string
		float: string
		script?: string
		objectType?: string
		objectTime?: string
		duration?: string
		clipName?: string
		feedback?: string
		transition?: string
		attributes?: {[key: string]: string}
	}
}

export interface IRundown {
	externalId: string
	name: string // namnet på sheeten
	expectedStart: number // unix time
	expectedEnd: number // unix time
}

export class InewsRundown implements IRundown {
	// id: string
	// name: string // namnet på sheeten
	// expectedStart: number // unix time
	// expectedEnd: number // unix time
	// sections: Section[] = []
	constructor (
		public externalId: string,
		public name: string,
		public gatewayVersion: string,
		public expectedStart: number,
		public expectedEnd: number,
		public segments: RundownSegment[] = []
	) {}

	serialize (): IRundown {
		return {
			externalId:				this.externalId,
			name:			this.name,
			expectedStart:	this.expectedStart,
			expectedEnd:	this.expectedEnd
		}
	}

	addSegments (segments: RundownSegment[]) {
		segments.forEach(segment => this.segments.push(segment))
	}
}
