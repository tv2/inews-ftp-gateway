declare module '@johnsand/inews' {
	import { EventEmitter } from 'events'

	export function inews (options: INewsOptions): INewsClient

	export interface INewsOptions {
		hosts: string | string[]
		user: string
		password: string
	}

	export interface INewsStory {
		id?: string
		fields: { [attributeName: string]: string }
		meta: { [key: string]: string }
		cues: Array<Array<string | null>>
		body?: string
	}

	export interface INewsDirItem {
		filetype: 'file' | 'queue'
		file: string
		modified?: Date
		flags?: { floated: boolean }
	}

	export interface INewsFile extends INewsDirItem {
		filetype: 'file'
		indentifier: string
		locator: string
		storyName: string
	}

	export interface INewsQueue extends INewsDirItem {
		filetype: 'queue'
	}

	export type status = 'connecting' | 'connected' | 'error' | 'disconnected'

	export interface INewsClient extends EventEmitter {
		_queue: { // Expose queue so if can be flsuhed after used
			queuedJobList: { list: object },
			inprogressJobList: { list: object }
		}
		list (queneName: string, cb: (error: Error | null, dirList: Array<INewsDirItem>) => void): void
		story (queueName: string, file: string, cb: (error: Error | null, rawStory: INewsStory) => void): void
		storyNsml (queueName: string, file: string, cb: (error: Error | null, nsml: string) => void): void
		on: ((event: 'status', listener: (status: string) => void) => this) &
		  ((event: 'ready', listener: () => void) => this) &
			((event: 'error', listener: (err: Error) => void) => this) &
			((event: 'close', listener: (hadErr?: boolean) => void) => this) &
			((event: 'end', listener: () => void) => this)
	}
}
