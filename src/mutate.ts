import * as _ from 'underscore'
import { IngestPlaylist, IngestRundown, IngestSegment } from '@sofie-automation/blueprints-integration'
import { RundownSegment, ISegment } from './classes/datastructures/Segment'
import { ReducedPlaylist, ReducedRundown } from './classes/RundownWatcher'
import { parseModifiedDateFromIngestSegmentWithFallbackToNow } from './helpers'

export const INGEST_RUNDOWN_TYPE = 'inews'

export function mutatePlaylist(playlist: ReducedPlaylist, rundowns: IngestRundown[]): IngestPlaylist {
	return {
		externalId: playlist.externalId,
		rundowns,
	}
}

export function mutateRundown(rundown: ReducedRundown, segments: RundownSegment[]): IngestRundown {
	return {
		externalId: rundown.externalId,
		name: rundown.name,
		type: INGEST_RUNDOWN_TYPE,
		payload: omit(rundown, 'segments'),
		segments: segments.map(mutateSegment),
	}
}
export function mutateSegment(segment: RundownSegment): IngestSegment {
	return {
		externalId: segment.externalId,
		name: segment.name,
		rank: segment.rank,
		payload: omit(segment, 'externalId', 'rank', 'name') as MutatedSegment,
		parts: [],
	}
}

export function IngestSegmentToRundownSegment(ingestSegment: IngestSegment): RundownSegment | undefined {
	const rundownId = ingestSegment.payload?.rundownId
	const inewsStory = ingestSegment.payload?.iNewsStory
	const modified = ingestSegment.payload?.modified
	const locator = ingestSegment.payload?.iNewsStory.locator

	if (rundownId === undefined || inewsStory === undefined || modified === undefined || locator === undefined) {
		return undefined
	}

	return new RundownSegment(
		rundownId,
		inewsStory,
		parseModifiedDateFromIngestSegmentWithFallbackToNow(modified),
		locator,
		ingestSegment.externalId,
		ingestSegment.rank,
		ingestSegment.name,
		ingestSegment.payload?.untimed,
		ingestSegment.payload?.segmentType ?? '',
		ingestSegment.payload?.isStartOfNewSegmentType ?? false
	)
}

export type MutatedSegment = Omit<ISegment, 'parts' | 'externalId' | 'rank' | 'name'>

interface IOmit {
	<T extends object, K extends [...(keyof T)[]]>(obj: T, ...keys: K): {
		[K2 in Exclude<keyof T, K[number]>]: T[K2]
	}
}

const omit: IOmit = (obj, ...keys) => {
	let ret = {} as {
		[K in keyof typeof obj]: typeof obj[K]
	}
	let key: keyof typeof obj
	for (key in obj) {
		if (!keys.includes(key)) {
			ret[key] = obj[key]
		}
	}
	return ret
}
