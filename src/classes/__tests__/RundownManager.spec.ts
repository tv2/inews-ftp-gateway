import { RundownManager } from '../RundownManager'
import { INewsStoryGW, ISegment } from '../datastructures/Segment'
import { segmentGW01, segmentGW02, segmentGW03, segmentGW04, segmentGW05 } from './__mocks__/mockSegments'
import { literal } from '../../helpers'

describe('RundownManager', () => {
	it('Converts raw to Sofie', () => {
		const manager = new RundownManager()
		let mockSegments: INewsStoryGW[] = [
			segmentGW01, segmentGW02, segmentGW03
		]
		let rundown = manager.convertRawtoSofie('rundown-01', 'Rundown 1', mockSegments)
		expect(rundown.segments).toEqual(
			literal<ISegment[]>([
				{
					rundownId: 'rundown-01',
					iNewsStory: segmentGW01,
					modified: new Date(0),
					externalId: 'segment-01',
					rank: 1000,
					name: 'Segment 01',
					float: false
				},
				{
					rundownId: 'rundown-01',
					iNewsStory: segmentGW02,
					modified: new Date(0),
					externalId: 'segment-02',
					rank: 2000,
					name: 'Segment 02',
					float: false
				},
				{
					rundownId: 'rundown-01',
					iNewsStory: segmentGW03,
					modified: new Date(0),
					externalId: 'segment-03',
					rank: 3000,
					name: 'Segment 03',
					float: false
				}
			]))
		mockSegments = [
			segmentGW01, segmentGW03, segmentGW02
		]
		rundown = manager.convertRawtoSofie('rundown-01', 'Rundown 1', mockSegments)
		expect(rundown.segments).toEqual(
			literal<ISegment[]>([
				{
					rundownId: 'rundown-01',
					iNewsStory: segmentGW01,
					modified: new Date(0),
					externalId: 'segment-01',
					rank: 1000,
					name: 'Segment 01',
					float: false
				},
				{
					rundownId: 'rundown-01',
					iNewsStory: segmentGW03,
					modified: new Date(0),
					externalId: 'segment-03',
					rank: 3000,
					name: 'Segment 03',
					float: false
				},
				{
					rundownId: 'rundown-01',
					iNewsStory: segmentGW02,
					modified: new Date(0),
					externalId: 'segment-02',
					rank: 4000,
					name: 'Segment 02',
					float: false
				}
			]))
		mockSegments = [
			segmentGW01, segmentGW03, segmentGW02, segmentGW04
		]
		rundown = manager.convertRawtoSofie('rundown-01', 'Rundown 1', mockSegments)
		expect(rundown.segments).toEqual(
			literal<ISegment[]>([
				{
					rundownId: 'rundown-01',
					iNewsStory: segmentGW01,
					modified: new Date(0),
					externalId: 'segment-01',
					rank: 1000,
					name: 'Segment 01',
					float: false
				},
				{
					rundownId: 'rundown-01',
					iNewsStory: segmentGW03,
					modified: new Date(0),
					externalId: 'segment-03',
					rank: 3000,
					name: 'Segment 03',
					float: false
				},
				{
					rundownId: 'rundown-01',
					iNewsStory: segmentGW02,
					modified: new Date(0),
					externalId: 'segment-02',
					rank: 4000,
					name: 'Segment 02',
					float: false
				},
				{
					rundownId: 'rundown-01',
					iNewsStory: segmentGW04,
					modified: new Date(0),
					externalId: 'segment-04',
					rank: 5000,
					name: 'Segment 04',
					float: false
				}
			]))
		mockSegments = [
			segmentGW01, segmentGW03, segmentGW05, segmentGW02, segmentGW04
		]
		rundown = manager.convertRawtoSofie('rundown-01', 'Rundown 1', mockSegments)
		expect(rundown.segments).toEqual(
			literal<ISegment[]>([
				{
					rundownId: 'rundown-01',
					iNewsStory: segmentGW01,
					modified: new Date(0),
					externalId: 'segment-01',
					rank: 1000,
					name: 'Segment 01',
					float: false
				},
				{
					rundownId: 'rundown-01',
					iNewsStory: segmentGW03,
					modified: new Date(0),
					externalId: 'segment-03',
					rank: 3000,
					name: 'Segment 03',
					float: false
				},
				{
					rundownId: 'rundown-01',
					iNewsStory: segmentGW05,
					modified: new Date(0),
					externalId: 'segment-05',
					rank: 3500,
					name: 'Segment 05',
					float: false
				},
				{
					rundownId: 'rundown-01',
					iNewsStory: segmentGW02,
					modified: new Date(0),
					externalId: 'segment-02',
					rank: 4000,
					name: 'Segment 02',
					float: false
				},
				{
					rundownId: 'rundown-01',
					iNewsStory: segmentGW04,
					modified: new Date(0),
					externalId: 'segment-04',
					rank: 5000,
					name: 'Segment 04',
					float: false
				}
			]))
	})
})
