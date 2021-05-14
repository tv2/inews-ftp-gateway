declare module 'inews' {
	import { EventEmitter } from 'events'

	function inews(options: inews.INewsOptions): inews.INewsClient
	export = inews

	namespace inews {
		type UnparsedCue = string[] | null

		interface INewsOptions {
			hosts: string | string[]
			user: string
			password: string
		}

		/**
		 * Defines fields consistent across iNews installations.
		 * May contain other data not relevant to the iNews gateway,
		 * 	but may be used in blueprints - installation / organisation dependent.
		 */
		interface INewsFields {
			title: string
			modifyDate: string // number
			pageNumber?: string
			tapeTime: string // number
			audioTime: string // number
			totalTime: string // number
			cumeTime: string // number
			backTime?: string // @number (seconds since midnight)
		}

		interface INewsMetaData {
			wire?: 'f' | 'b' | 'u' | 'r' | 'o'
			mail?: 'read' | 'unread'
			locked?: 'pass' | 'user'
			words?: string // number
			rate?: string // number
			break?: string
			mcserror?: string
			hold?: string
			float?: 'float' | undefined
			delete?: string
		}

		interface INewsStory {
			/** Same identifier as the file the story came from */
			identifier: string
			locator: string
			fields: INewsFields
			meta: INewsMetaData
			cues: Array<UnparsedCue | null>
			body?: string
		}

		interface INewsDirItem {
			filetype: 'file' | 'queue'
			file: string
			modified?: Date
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
			list(queneName: string, cb: (error: Error | null, dirList: Array<INewsDirItem>) => void): void
			story(queueName: string, file: string, cb: (error: Error | null, rawStory: INewsStory) => void): void
			storyNsml(queueName: string, file: string, cb: (error: Error | null, nsml: string) => void): void
			queueLength(): number
			on: ((event: 'status', listener: (status: { name: string; host: string }) => void) => this) &
				((event: 'ready', listener: () => void) => this) &
				((event: 'error', listener: (err: Error) => void) => this) &
				((event: 'close', listener: (hadErr?: boolean) => void) => this) &
				((event: 'end', listener: () => void) => this)
		}
	}
}
