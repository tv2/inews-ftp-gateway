import { INewsStoryGW, RundownSegment } from '../../datastructures/Segment'
import * as _ from 'underscore'

export const segmentGW01: INewsStoryGW = {
	fileId: 'segment-01',
	id: 'segment-01',
	fields: {
		title: 'Segment 01'
	},
	meta: {
		words: '140',
		rate: '6'
	},
	cues: [],
	body: '',
	identifier: 'segment-01'
}

export const segmentGW02: INewsStoryGW = {
	fileId: 'segment-02',
	id: 'segment-02',
	fields: {
		title: 'Segment 02'
	},
	meta: {
		words: '140',
		rate: '6'
	},
	cues: [],
	body: '',
	identifier: 'segment-02'
}

export const segmentGW03: INewsStoryGW = {
	fileId: 'segment-03',
	id: 'segment-03',
	fields: {
		title: 'Segment 03'
	},
	meta: {
		words: '140',
		rate: '6'
	},
	cues: [],
	body: '',
	identifier: 'segment-03'
}

export const segmentGW04: INewsStoryGW = {
	fileId: 'segment-04',
	id: 'segment-04',
	fields: {
		title: 'Segment 04'
	},
	meta: {
		words: '140',
		rate: '6'
	},
	cues: [],
	body: '',
	identifier: 'segment-04'
}

export const segmentGW05: INewsStoryGW = {
	fileId: 'segment-05',
	id: 'segment-05',
	fields: {
		title: 'Segment 05'
	},
	meta: {
		words: '140',
		rate: '6'
	},
	cues: [],
	body: '',
	identifier: 'segment-05'
}

export const segmentGW06: INewsStoryGW = {
	fileId: 'segment-06',
	id: 'segment-06',
	fields: {
		title: 'Segment 06'
	},
	meta: {
		words: '140',
		rate: '6'
	},
	cues: [],
	body: '',
	identifier: 'segment-06'
}

export const segmentGW07: INewsStoryGW = {
	fileId: 'segment-07',
	id: 'segment-07',
	fields: {
		title: 'Segment 07'
	},
	meta: {
		words: '140',
		rate: '6'
	},
	cues: [],
	body: '',
	identifier: 'segment-07'
}

export const segmentGW08: INewsStoryGW = {
	fileId: 'segment-08',
	id: 'segment-08',
	fields: {
		title: 'Segment 08'
	},
	meta: {
		words: '140',
		rate: '6'
	},
	cues: [],
	body: '',
	identifier: 'segment-08'
}

export function RundownSegmentFromMockSegment (rundownId: string, segmentGW: INewsStoryGW): RundownSegment {
	return new RundownSegment(rundownId, _.clone(segmentGW), '0', segmentGW.identifier, 0, segmentGW.fields.title, false)
}
