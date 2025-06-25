import axios from 'axios'
import { HttpInewsClient } from '../HttpInewsClient'

const mockLogger = {
	debug: jest.fn(),
	error: jest.fn(),
	data: jest.fn().mockReturnThis(),
	tag: jest.fn().mockReturnThis(),
	warn: jest.fn(),
	info: jest.fn(),
	trace: jest.fn(),
	meta: jest.fn().mockReturnThis(),
	setLevel: jest.fn(),
}

const settings = {
	hosts: ['http://localhost:3000'],
}

const mockFTPStory = {
	filetype: 'story',
	file: '10098408:01769D55:684C0F3A',
	identifier: '10098408',
	locator: '01769D55:684C0F3A',
	storyName: 'Pre sending',
	modified: new Date('2025-07-01T07:17:00.000Z'),
	flags: { floated: true },
}

const mockStory = {
	identifier: '10098408',
	locator: '01769D55:684C0F3A',
	fields: {
		title: { value: 'Pre sending', attributes: { uec: false } },
		modifyDate: { value: '1749807840', attributes: { uec: false } },
		audioTime: { value: '0', attributes: { uec: false } },
		totalTime: { value: '0', attributes: { uec: false } },
		runsTime: { value: '0', attributes: { uec: false } },
		pageNumber: undefined,
		tapeTime: undefined,
		cumeTime: undefined,
		backTime: undefined,
		layout: undefined,
		videoId: undefined,
	},
	meta: { rate: '205float=float' },
	cues: [],
	attachments: {},
	id: '10098408:01769d55:684c0f3a',
	body: '\r\n<p><pi>KAM H</pi></p>\r\n<p><pi></pi></p>\r\n',
}

describe('HttpInewsClient', () => {
	// Use restoreAllMocks to ensure spies are reset after each test
	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('constructs with and without logger', () => {
		const client1 = new HttpInewsClient(settings, mockLogger)
		expect(client1).toBeInstanceOf(HttpInewsClient)
		const client2 = new HttpInewsClient(settings)
		expect(client2).toBeInstanceOf(HttpInewsClient)
	})

	describe('listStories', () => {
		it('returns stories on success', async () => {
			// Spy on axios.get and mock its return value for this test
			jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: [mockFTPStory] })
			const client = new HttpInewsClient(settings, mockLogger)
			const result = await client.listStories('QUEUE')
			expect(result).toEqual([mockFTPStory])
			expect(mockLogger.debug).toHaveBeenCalled()
		})
		it('throws and logs on error', async () => {
			// Spy on axios.get and mock a failure for this test
			jest.spyOn(axios, 'get').mockRejectedValueOnce(new Error('fail'))
			const client = new HttpInewsClient(settings, mockLogger)
			await expect(client.listStories('QUEUE')).rejects.toThrow('Failed to list stories for queue')
			expect(mockLogger.error).toHaveBeenCalled()
		})
	})

	describe('getStory', () => {
		it('returns story on success', async () => {
			jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: mockStory })
			const client = new HttpInewsClient(settings, mockLogger)
			const result = await client.getStory('QUEUE', '10098408')
			expect(result).toEqual(mockStory)
			expect(mockLogger.debug).toHaveBeenCalled()
		})
		it('throws and logs on error', async () => {
			jest.spyOn(axios, 'get').mockRejectedValueOnce(new Error('fail'))
			const client = new HttpInewsClient(settings, mockLogger)
			await expect(client.getStory('QUEUE', '10098408')).rejects.toThrow('Failed to get story')
			expect(mockLogger.error).toHaveBeenCalled()
		})
	})

	describe('getHealth', () => {
		it('returns health on success', async () => {
			jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: { status: 'ok' } })
			const client = new HttpInewsClient(settings, mockLogger)
			const result = await client.getHealth()
			expect(result).toEqual({ status: 'ok' })
			expect(mockLogger.debug).toHaveBeenCalled()
		})
		it('throws and logs on error', async () => {
			jest.spyOn(axios, 'get').mockRejectedValueOnce(new Error('fail'))
			const client = new HttpInewsClient(settings, mockLogger)
			await expect(client.getHealth()).rejects.toThrow('Failed to get health')
			expect(mockLogger.error).toHaveBeenCalled()
		})
	})
})
