declare module '@johnsand/inews' {
	import { EventEmitter } from 'events'

	function inews (options: inews.INewsOptions): inews.INewsClient
	export = inews

	namespace inews {
		interface INewsOptions {
			hosts: string | string[]
			user: string
			password: string
		}

		interface INewsStory {
			id?: string
			fields: { [attributeName: string]: string }
			meta: { [key: string]: string }
			cues: Array<Array<string | null>>
			body?: string
			/** Same identifier as the file the story came from */
			identifier: string
		}

		interface INewsDirItem {
			filetype: 'file' | 'queue'
			file: string
			modified?: Date
			flags?: { floated: boolean }
		}

		interface INewsFile extends INewsDirItem {
			filetype: 'file'
			/* Unique identifier. Sometimes blank (temporarily) */
			identifier: string
			locator: string
			storyName: string
		}

		interface INewsQueue extends INewsDirItem {
			filetype: 'queue'
		}

		type status = 'connecting' | 'connected' | 'error' | 'disconnected'

		interface INewsClient extends EventEmitter {
			/* _queue: { // Expose queue so if can be flsuhed after used
				queuedJobList: { list: object },
				inprogressJobList: { list: object }
			} */
			list (queneName: string, cb: (error: Error | null, dirList: Array<INewsDirItem>) => void): void
			story (queueName: string, file: string, cb: (error: Error | null, rawStory: INewsStory) => void): void
			storyNsml (queueName: string, file: string, cb: (error: Error | null, nsml: string) => void): void
			queueLength (): number
			on: ((event: 'status', listener: (status: string) => void) => this) &
			  ((event: 'ready', listener: () => void) => this) &
				((event: 'error', listener: (err: Error) => void) => this) &
				((event: 'close', listener: (hadErr?: boolean) => void) => this) &
				((event: 'end', listener: () => void) => this)
		}
	}
}
