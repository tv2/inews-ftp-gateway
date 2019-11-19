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
		fileType: 'file'
		indentifier: string
		locator: string
		storyName: string
	}

	export interface INewsQueue extends INewsDirItem {
		fileType: 'queue'
	}

	export interface INewsClient extends EventEmitter {
		list (queneName: string, cb: (error: Error | null, dirList: Array<INewsDirItem>) => void): void
		story (queueName: string, file: string, cb: (error: Error | null, rawStory: INewsStory) => void): void
		storyNsml (queueName: string, file: string, cb: (error: Error | null, nsml: string) => void): void
	}
}
