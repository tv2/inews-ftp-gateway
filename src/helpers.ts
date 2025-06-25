import { IngestSegment } from '@sofie-automation/blueprints-integration'
import { ISegment } from './classes/datastructures/Segment'
import { INewsStory } from '@tv2media/inews'

export function literal<T>(o: T) {
	return o
}

export function assertUnreachable(_never: never): never {
	throw new Error('Switch validation failed, look for assertUnreachable(...)')
}

function isValidDate(d: Date) {
	return !isNaN(d.getTime())
}

export function parseModifiedDateFromInewsStoryWithFallbackToNow(story: INewsStory): Date {
	// TODO: Replace 'any' with interface matching HTTP API
	if (story?.fields?.modifyDate?.value) {
		const modifyDate = new Date(story?.fields?.modifyDate.value)
		if (isValidDate(modifyDate)) {
			return modifyDate
		}
	}

	// fall back to "now"
	return new Date()
}

export function parseModifiedDateFromIngestSegmentWithFallbackToNow(segment: IngestSegment<ISegment>): Date {
	if (segment?.payload?.modified) {
		const modifyDate = new Date(segment?.payload?.modified)
		if (isValidDate(modifyDate)) {
			return modifyDate
		}
	}

	// fall back to "now"
	return new Date()
}

export function ReflectPromise<T>(
	ps: Promise<T>
): Promise<{ value: T; status: 'fulfilled' } | { e: any; status: 'rejected' }> {
	return ps.then(
		(value) => ({ value, status: 'fulfilled' }),
		(e) => {
			console.error('Promise rejected:', e, JSON.stringify(e))
			return { e, status: 'rejected' }
		}
	)
}
