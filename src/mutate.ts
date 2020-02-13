import * as _ from 'underscore'
import { INewsRundown } from './classes/datastructures/Rundown'
import { IngestRundown, IngestSegment } from 'tv-automation-sofie-blueprints-integration'
import { RundownSegment } from './classes/datastructures/Segment'

/** These are temorary mutation functions to convert sheet types to ingest types */
export function mutateRundown (rundown: INewsRundown): IngestRundown {
	return {
		externalId: rundown.externalId,
		name: rundown.name,
		type: 'inews',
		payload: _.omit(rundown, 'segments'),
		segments: _.values(rundown.segments || {}).map(mutateSegment)
	}
}
export function mutateSegment (segment: RundownSegment): IngestSegment {
	return {
		externalId: segment.externalId,
		name: segment.name,
		rank: segment.rank,
		payload: _.omit(segment, 'parts'),
		parts: []
	}
}
