import { VERSION } from '../../../version'
import { INewsStoryGW } from '../../datastructures/Segment'
import { ReducedRundown } from '../../RundownWatcher'
import { INewsFile } from 'inews'
import { literal, parseModifiedDateFromInewsStoryWithFallbackToNow } from '../../../helpers'

const queueName = 'FAKE.QUEUE.NAME'
export const mockData = {
	queueName,
	dirList: literal<INewsFile[]>([
		literal<INewsFile>({
			filetype: 'file',
			file: '1cc53fc6:00030be2:63c55b05',
			identifier: '1cc53fc6',
			locator: '00030be2:63c55b05',
			storyName: '',
			modified: new Date('2023-02-16T20:37:00.000Z'),
		}),
		literal<INewsFile>({
			filetype: 'file',
			file: '1bc53fc6:0052ecd7:63c55161',
			identifier: '1bc53fc6',
			locator: '0052ecd7:63c55161',
			storyName: '',
			modified: new Date('2023-02-16T20:37:00.000Z'),
		}),
		literal<INewsFile>({
			filetype: 'file',
			file: '1ac53fc6:0052d8ba:63c5515d',
			identifier: '1ac53fc6',
			locator: '0052d8ba:63c5515d',
			storyName: '',
			modified: new Date('2023-02-16T20:37:00.000Z'),
		}),
		literal<INewsFile>({
			filetype: 'file',
			file: '12c53fc6:00030be0:63c55b19',
			identifier: '12c53fc6',
			locator: '00030be0:63c55b19',
			storyName: '',
			modified: new Date('2023-02-16T20:37:00.000Z'),
		}),
		literal<INewsFile>({
			filetype: 'file',
			file: '1fc53fc6:0052f307:63c55176',
			identifier: '1fc53fc6',
			locator: '0052f307:63c55176',
			storyName: '',
			modified: new Date('2023-02-16T20:37:00.000Z'),
		}),
		literal<INewsFile>({
			filetype: 'file',
			file: '1ec53fc6:00522b99:63c5510e',
			identifier: '1ec53fc6',
			locator: '00522b99:63c5510e',
			storyName: '',
			modified: new Date('2023-02-16T20:37:00.000Z'),
		}),
		literal<INewsFile>({
			filetype: 'file',
			file: '1dc53fc6:00522a7b:63c5510e',
			identifier: '1dc53fc6',
			locator: '00522a7b:63c5510e',
			storyName: '',
			modified: new Date('2023-02-16T20:37:00.000Z'),
		}),
		literal<INewsFile>({
			filetype: 'file',
			file: '0ac53fc5:0050bbdd:63c54d4c',
			identifier: '0ac53fc5',
			locator: '0050bbdd:63c54d4c',
			storyName: '',
			modified: new Date('2023-02-16T20:37:00.000Z'),
		}),
		literal<INewsFile>({
			filetype: 'file',
			file: '09c53fc5:00030be8:63c55b1c',
			identifier: '09c53fc5',
			locator: '00030be8:63c55b1c',
			storyName: '',
			modified: new Date('2023-02-16T20:37:00.000Z'),
		}),
		literal<INewsFile>({
			filetype: 'file',
			file: '07c53fc5:0051cc42:63c55d6f',
			identifier: '07c53fc5',
			locator: '0051cc42:63c55d6f',
			storyName: '',
			modified: new Date('2023-02-16T20:37:00.000Z'),
		}),
		literal<INewsFile>({
			filetype: 'file',
			file: '08c53fc5:0050cc42:63c54d6f',
			identifier: '08c53fc5',
			locator: '0050cc42:63c54d6f',
			storyName: '',
			modified: new Date('2023-02-16T20:37:00.000Z'),
		}),
	]),
	rawSegments: literal<INewsStoryGW[]>([
		literal<INewsStoryGW>({
			fields: {
				title: 'Segment 1',
				audioTime: '8',
				totalTime: '8',
				modifyDate: '1676580420',
				vType: 'News',
			},
			meta: {},
			cues: [],
			id: '1cc53fc6:00030be2:63c55b05',
			body: '<p><cc></cc></p>',
			identifier: '1cc53fc6',
			locator: '00030be2:63c55b05',
		}),
		literal<INewsStoryGW>({
			fields: {
				title: 'Segment 2',
				audioTime: '9',
				totalTime: '9',
				modifyDate: '1676580420',
			},
			meta: {},
			cues: [],
			id: '1bc53fc6:0052ecd7:63c55161',
			body: '<p><cc></cc></p>',
			identifier: '1bc53fc6',
			locator: '0052ecd7:63c55161',
		}),
		literal<INewsStoryGW>({
			fields: {
				title: 'Segment 3',
				audioTime: '11',
				totalTime: '11',
				modifyDate: '1676580420',
			},
			meta: {},
			cues: [],
			id: '1ac53fc6:0052d8ba:63c5515d',
			body: '<p><cc></cc></p>',
			identifier: '1ac53fc6',
			locator: '0052d8ba:63c5515d',
		}),
		literal<INewsStoryGW>({
			fields: {
				title: 'Segment 4',
				audioTime: '6',
				totalTime: '6',
				modifyDate: '1676580420',
				vType: 'Sport',
			},
			meta: {},
			cues: [],
			id: '12c53fc6:00030be0:63c55b19',
			body: '<p><cc></cc></p>',
			identifier: '12c53fc6',
			locator: '00030be0:63c55b19',
		}),
		literal<INewsStoryGW>({
			fields: {
				title: 'Segment 5',
				audioTime: '0',
				totalTime: '3',
				modifyDate: '1676580420',
			},
			meta: {},
			cues: [],
			id: '1fc53fc6:0052f307:63c55176',
			body: '<p><cc></cc></p>',
			identifier: '1fc53fc6',
			locator: '0052f307:63c55176',
		}),
		literal<INewsStoryGW>({
			fields: {
				audioTime: '0',
				totalTime: '0',
				modifyDate: '1676580420',
			},
			meta: {},
			cues: [],
			id: '1ec53fc6:00522b99:63c5510e',
			body: '<p><cc></cc></p>',
			identifier: '1ec53fc6',
			locator: '00522b99:63c5510e',
		}),
		literal<INewsStoryGW>({
			fields: {
				audioTime: '0',
				totalTime: '0',
				modifyDate: '1676580420',
				vType: 'FromFloat',
			},
			meta: {
				rate: '205',
				float: 'float',
			},
			cues: [],
			id: '1dc53fc6:00522a7b:63c5510e',
			body: '<p><cc></cc></p>',
			identifier: '1dc53fc6',
			locator: '00522a7b:63c5510e',
		}),
		literal<INewsStoryGW>({
			fields: {
				audioTime: '0',
				totalTime: '0',
				modifyDate: '1676580420',
			},
			meta: {
				rate: '205',
			},
			cues: [],
			id: '0ac53fc5:0050bbdd:63c54d4c',
			body: '<p><cc></cc></p>',
			identifier: '0ac53fc5',
			locator: '0050bbdd:63c54d4c',
		}),
		literal<INewsStoryGW>({
			fields: {
				title: 'Segment 9',
				audioTime: '16',
				totalTime: '111',
				modifyDate: '1676580420',
				vType: 'Weather',
			},
			meta: {},
			cues: [],
			id: '09c53fc5:00030be8:63c55b1c',
			body: '<p><cc></cc></p>',
			identifier: '09c53fc5',
			locator: '00030be8:63c55b1c',
		}),
		literal<INewsStoryGW>({
			fields: {
				title: 'Segment 10',
				audioTime: '0',
				totalTime: '146',
				modifyDate: '1676580420',
			},
			meta: {},
			cues: [],
			id: '08c53fc5:0050cc42:63c54d6f',
			body: '<p><cc></cc></p>',
			identifier: '08c53fc5',
			locator: '0050cc42:63c54d6f',
		}),
	]),
	segmentExternalIds: literal<string[]>([
		'1cc53fc6',
		'1bc53fc6',
		'1ac53fc6',
		'12c53fc6',
		'1fc53fc6',
		'1ec53fc6',
		'1dc53fc6',
		'0ac53fc5',
		'09c53fc5',
		'08c53fc5',
	]),
}

export const playlist = literal<ReducedRundown>({
	externalId: queueName,
	name: queueName,
	gatewayVersion: VERSION,
	segments: [],
})

Object.defineProperty(playlist, 'segments', {
	get: () => {
		return mockData.rawSegments.map((rs, index) => {
			return {
				externalId: rs.identifier,
				name: rs.fields.title ?? '',
				modified: parseModifiedDateFromInewsStoryWithFallbackToNow(rs),
				locator: rs.locator,
				rank: index,
			}
		})
	},
})
