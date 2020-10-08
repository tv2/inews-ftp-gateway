import { INewsStoryGW, RundownSegment } from '../../datastructures/Segment'
import * as _ from 'underscore'

export const segmentGW01: INewsStoryGW = {
	fields: {
		title: 'Segment 01',
		modifyDate: ''
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
	fields: {
		title: 'Segment 02',
		modifyDate: ''
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
	fields: {
		title: 'Segment 03',
		modifyDate: ''
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
	fields: {
		title: 'Segment 04',
		modifyDate: ''
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
	fields: {
		title: 'Segment 05',
		modifyDate: ''
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
	fields: {
		title: 'Segment 06',
		modifyDate: ''
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
	fields: {
		title: 'Segment 07',
		modifyDate: ''
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
	fields: {
		title: 'Segment 08',
		modifyDate: ''
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
	return new RundownSegment(rundownId, _.clone(segmentGW), '0', segmentGW.identifier, 0, segmentGW.fields.title)
}
