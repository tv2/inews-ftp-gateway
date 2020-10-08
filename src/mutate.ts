import * as _ from 'underscore'
import { INewsRundown } from './classes/datastructures/Rundown'
import { IngestRundown, IngestSegment } from 'tv-automation-sofie-blueprints-integration'
import { RundownSegment, ISegment } from './classes/datastructures/Segment'

export const INGEST_RUNDOWN_TYPE = 'inews'

/** These are temorary mutation functions to convert sheet types to ingest types */
export function mutateRundown (rundown: INewsRundown): IngestRundown {
	return {
		externalId: rundown.externalId,
		name: rundown.name,
		type: INGEST_RUNDOWN_TYPE,
		payload: omit(rundown, 'segments'),
		segments: _.values(rundown.segments || {}).map(mutateSegment)
	}
}
export function mutateSegment (segment: RundownSegment): IngestSegment {
	return {
		externalId: segment.externalId,
		name: segment.name,
		rank: segment.rank,
		payload: omit(segment, 'externalId', 'rank', 'name', 'rundownId') as MutatedSegment,
		parts: []
	}
}

export type MutatedSegment = Omit<ISegment, 'parts' | 'externalId' | 'rank' | 'name' | 'rundownId'>

interface IOmit {
	<T extends object, K extends [...(keyof T)[]]>
	(obj: T, ...keys: K): {
		[K2 in Exclude<keyof T, K[number]>]: T[K2]
	}
}

const omit: IOmit = (obj, ...keys) => {
	let ret = {} as {
		[K in keyof typeof obj]: (typeof obj)[K]
	}
	let key: keyof typeof obj
	for (key in obj) {
		if (!(keys.includes(key))) {
			ret[key] = obj[key]
		}
	}
	return ret
}
