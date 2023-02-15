import { INewsStoryGW, RundownSegment } from '../../datastructures/Segment'
import * as _ from 'underscore'
import { ReducedSegment } from '../../RundownWatcher'
import { parseModifiedDateFromInewsStoryWithFallbackToNow } from '../../../helpers'
import { SegmentId } from '../../../helpers/id'
import { SegmentRankingsInner, SegmentRankings } from '../../ParsedINewsToSegments'

export const rundownId = 'test-rundown'

export const segmentGW01: ReducedSegment = {
	name: 'Segment 01',
	modified: new Date(0),
	externalId: 'segment-01',
	rank: 1,
	locator: 'segment01',
}

export const segmentGW02: ReducedSegment = {
	name: 'Segment 02',
	modified: new Date(0),
	externalId: 'segment-02',
	rank: 2,
	locator: 'segment02',
}

export const segmentGW03: ReducedSegment = {
	name: 'Segment 03',
	modified: new Date(0),
	externalId: 'segment-03',
	rank: 3,
	locator: 'segment03',
}

export const segmentGW04: ReducedSegment = {
	name: 'Segment 04',
	modified: new Date(0),
	externalId: 'segment-04',
	rank: 4,
	locator: 'segment04',
}

export const segmentGW05: ReducedSegment = {
	name: 'Segment 05',
	modified: new Date(0),
	externalId: 'segment-05',
	rank: 5,
	locator: 'segment05',
}

export const segmentGW06: ReducedSegment = {
	name: 'Segment 06',
	modified: new Date(0),
	externalId: 'segment-06',
	rank: 6,
	locator: 'segment06',
}

export const segmentGW07: ReducedSegment = {
	name: 'Segment 07',
	modified: new Date(0),
	externalId: 'segment-07',
	rank: 7,
	locator: 'segment07',
}

export const segmentGW08: ReducedSegment = {
	name: 'Segment 08',
	modified: new Date(0),
	externalId: 'segment-08',
	rank: 8,
	locator: 'segment08',
}

export function RundownSegmentFromMockSegment(
	rundownId: string,
	segmentGW: INewsStoryGW,
	untimed: boolean
): RundownSegment {
	const modifiedDate = parseModifiedDateFromInewsStoryWithFallbackToNow(segmentGW)

	return new RundownSegment(
		rundownId,
		_.clone(segmentGW),
		modifiedDate,
		segmentGW.locator,
		segmentGW.identifier,
		0,
		segmentGW.fields.title ?? '',
		untimed,
		segmentGW.fields.vType
	)
}

export function makeSegmentRanks(segments: { [segmentId: string]: SegmentRankingsInner }): SegmentRankings {
	const ranks: SegmentRankings = new Map()

	ranks.set(rundownId, makeSegmentRanksInner(segments))

	return ranks
}

export function makeSegmentRanksInner(segments: {
	[segmentId: string]: SegmentRankingsInner
}): Map<SegmentId, SegmentRankingsInner> {
	const segmentRanksInner: Map<SegmentId, SegmentRankingsInner> = new Map()

	for (const segmentId in segments) {
		segmentRanksInner.set(segmentId, segments[segmentId])
	}

	return segmentRanksInner
}
