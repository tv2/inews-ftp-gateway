import * as _ from 'underscore'
import { InewsRundown } from './classes/Rundown'
import { IngestRundown, IngestSegment, IngestPart } from 'tv-automation-sofie-blueprints-integration'
import { RundownSegment } from './classes/Segment'
import { IRundownPart } from './classes/Part'

/** These are temorary mutation functions to convert sheet types to ingest types */
export function mutateRundown (rundown: InewsRundown): IngestRundown {
	return {
		externalId: rundown.externalId,
		name: rundown.name,
		type: 'external',
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
		parts: _.values(segment.parts || {}).map(mutatePart)
	}
}
export function mutatePart (part: IRundownPart): IngestPart {
	return {
		externalId: part.externalId,
		name: part.name,
		rank: part.rank,
		payload: part
	}
}
