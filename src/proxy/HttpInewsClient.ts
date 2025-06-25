import axios from 'axios'
import { INewsStory, INewsFTPStory } from '@tv2media/inews'
import { logger as defaultLogger } from '../logger'
import { ILogger as Logger } from '@tv2media/logger'
import { INewsDeviceSettings } from '../inewsHandler'

/**
 * HTTP client for interacting with the iNews Gateway API.
 */
export class HttpInewsClient {
	private readonly baseUrl: string
	private readonly logger: Logger

	/**
	 * @param settings iNews device settings (must include hosts)
	 * @param logger Optional logger instance (defaults to global logger)
	 */
	constructor(settings: INewsDeviceSettings, logger?: Logger) {
		if (!settings.hosts || settings.hosts.length === 0) {
			throw new Error('INewsDeviceSettings must include at least one host')
		}
		this.baseUrl = settings.hosts[0]
		this.logger = (logger ?? defaultLogger).tag(this.constructor.name)
	}

	/**
	 * List all stories in a queue.
	 * @param queueName Name of the queue
	 * @returns Array of INewsStory objects
	 */
	async listStories(queueName: string): Promise<INewsFTPStory[]> {
		const url = `${this.baseUrl}/queues/${encodeURIComponent(queueName)}`
		this.logger.debug(`GET ${url}`)
		try {
			const res = await axios.get(url)
			return res.data as INewsFTPStory[]
		} catch (error) {
			this.logger.data(error).error(`Failed to list stories for queue: ${queueName}`)
			throw new Error(`Failed to list stories for queue '${queueName}': ${error}`)
		}
	}

	/**
	 * Get a single story by ID in a queue.
	 * @param queueName Name of the queue
	 * @param storyId ID of the story
	 * @returns The INewsStory object
	 */
	async getStory(queueName: string, storyId: string): Promise<INewsStory> {
		const url = `${this.baseUrl}/queues/${encodeURIComponent(queueName)}/stories/${storyId}`
		this.logger.debug(`GET ${url}`)
		try {
			const res = await axios.get(url)
			return res.data as INewsStory
		} catch (error) {
			this.logger.data(error).error(`Failed to get story '${storyId}' in queue: ${queueName}`)
			throw new Error(`Failed to get story '${storyId}' in queue '${queueName}': ${error}`)
		}
	}

	/**
	 * Get the health status from the API.
	 * @returns Health status object
	 */
	async getHealth(): Promise<any> {
		const url = `${this.baseUrl}/health`
		this.logger.debug(`GET ${url}`)
		try {
			const res = await axios.get(url)
			return res.data
		} catch (error) {
			this.logger.data(error).error(`Failed to get health from ${url}`)
			throw new Error(`Failed to get health from ${url}: ${error}`)
		}
	}
}
