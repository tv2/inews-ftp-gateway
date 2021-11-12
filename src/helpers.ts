import { INewsStory } from 'inews'
import { IngestSegment } from '@sofie-automation/blueprints-integration'

export function literal<T>(o: T) {
	return o
}

export function assertUnreachable(_never: never): never {
	throw new Error('Switch validation failed, look for assertUnreachable(...)')
}

function isValidDate(d: Date) {
	return !isNaN(d.getTime())
}

export function parseModifiedDateFromInewsStoryWithFallbackToNow(story: INewsStory) {
	if (story?.fields?.modifyDate) {
		const modifyDate = new Date(story?.fields?.modifyDate)
		if (isValidDate(modifyDate)) {
			return modifyDate
		}
	}

	// fall back to "now"
	return new Date()
}

export function ParseModifiedDateFromIngestSegmentWithFallbackToNow(segment: IngestSegment) {
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
		(e) => ({ e, status: 'rejected' })
	)
}
