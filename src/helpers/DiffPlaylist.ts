import { logger } from '../logger'
import { INewsRundown } from '../classes/datastructures/Rundown'
import { literal } from '../helpers'
import { GetMovedSegments } from './GetMovedSegments'
import { SegmentId } from './id'

export enum PlaylistChangeType {
	PlaylistChangeSegmentDeleted = 'segment_deleted',
	PlaylistChangeSegmentCreated = 'segment_created',
	PlaylistChangeSegmentChanged = 'segment_changed',
	PlaylistChangeSegmentMoved = 'segment_moved',
	PlaylistChangeRundownDeleted = 'rundown_deleted',
	PlaylistChangeRundownCreated = 'rundown_created',
	PlaylistChangeRundownUpdated = 'rundown_updated',
	PlaylistChangeRundownMetaDataUpdated = 'rundown_metadata_updated',
}

export interface PlaylistChangeBase {
	type: PlaylistChangeType
}

export interface PlaylistChangeSegmentDeleted extends PlaylistChangeBase {
	type: PlaylistChangeType.PlaylistChangeSegmentDeleted
	rundownExternalId: string
	segmentExternalId: string
}

export interface PlaylistChangeSegmentCreated extends PlaylistChangeBase {
	type: PlaylistChangeType.PlaylistChangeSegmentCreated
	rundownExternalId: string
	segmentExternalId: string
}

export interface PlaylistChangeSegmentChanged extends PlaylistChangeBase {
	type: PlaylistChangeType.PlaylistChangeSegmentChanged
	rundownExternalId: string
	segmentExternalId: string
}

export interface PlaylistChangeSegmentMoved extends PlaylistChangeBase {
	type: PlaylistChangeType.PlaylistChangeSegmentMoved
	rundownExternalId: string
	segmentExternalId: string
}

export interface PlaylistChangeRundownCreated extends PlaylistChangeBase {
	type: PlaylistChangeType.PlaylistChangeRundownCreated
	rundownExternalId: string
}

export interface PlaylistChangeRundownUpdated extends PlaylistChangeBase {
	type: PlaylistChangeType.PlaylistChangeRundownUpdated
	rundownExternalId: string
}

export interface PlaylistChangeRundownMetaDataUpdated extends PlaylistChangeBase {
	type: PlaylistChangeType.PlaylistChangeRundownMetaDataUpdated
	rundownExternalId: string
}

export type PlaylistChange =
	| PlaylistChangeSegmentCreated
	| PlaylistChangeSegmentDeleted
	| PlaylistChangeSegmentChanged
	| PlaylistChangeSegmentMoved
	| PlaylistChangeRundownCreated
	| PlaylistChangeRundownMetaDataUpdated
	| PlaylistChangeRundownUpdated

export type SegmentChanges = {
	// rundownId: changes
	movedSegments: SegmentId[]
	notMovedSegments: SegmentId[]
	insertedSegments: SegmentId[]
	deletedSegments: SegmentId[]
	changedSegments: SegmentId[]
}

export function DiffPlaylist(
	rundown: INewsRundown,
	previous: INewsRundown | undefined
): {
	playlistChanges: PlaylistChange[]
	segmentChanges: SegmentChanges
} {
	const changes: PlaylistChange[] = []

	if (!previous) {
		logger.debug(`Diff: Rundown ${rundown.externalId} created`)
		changes.push(
			literal<PlaylistChangeRundownCreated>({
				type: PlaylistChangeType.PlaylistChangeRundownCreated,
				rundownExternalId: rundown.externalId,
			})
		)
		return {
			playlistChanges: changes,
			segmentChanges: {
				movedSegments: [],
				notMovedSegments: [],
				insertedSegments: rundown.segments.map((s) => s.externalId),
				deletedSegments: [],
				changedSegments: [],
			},
		}
	}

	let { movedSegments, notMovedSegments, insertedSegments, deletedSegments } = GetMovedSegments(
		previous.segments.map((s) => s.externalId),
		rundown.segments.map((s) => s.externalId)
	)
	let changedSegments: SegmentId[] = []

	movedSegments.forEach((s) => {
		logger.debug(`Diff: Segment ${s} moved`)
		changes.push(
			literal<PlaylistChangeSegmentMoved>({
				type: PlaylistChangeType.PlaylistChangeSegmentMoved,
				rundownExternalId: rundown.externalId,
				segmentExternalId: s,
			})
		)
	})

	insertedSegments.forEach((s) => {
		logger.debug(`Diff: Segment ${s} inserted`)
		changes.push(
			literal<PlaylistChangeSegmentCreated>({
				type: PlaylistChangeType.PlaylistChangeSegmentCreated,
				rundownExternalId: rundown.externalId,
				segmentExternalId: s,
			})
		)
	})

	deletedSegments.forEach((s) => {
		logger.debug(`Diff: Segment ${s} deleted`)
		changes.push(
			literal<PlaylistChangeSegmentDeleted>({
				type: PlaylistChangeType.PlaylistChangeSegmentDeleted,
				rundownExternalId: rundown.externalId,
				segmentExternalId: s,
			})
		)
	})

	// Find segments that have changed, rather than staying put / just being moved
	const segmentsToCheckForChanges = [...movedSegments, ...notMovedSegments]
	for (const segmentId of segmentsToCheckForChanges) {
		const current = rundown.segments.find((s) => s.externalId === segmentId)
		const prev = previous.segments.find((s) => s.externalId === segmentId)

		if (!current || !prev) continue

		if (JSON.stringify(prev.serialize()) !== JSON.stringify(current.serialize())) {
			if (!changedSegments.includes(segmentId)) {
				changedSegments.push(segmentId)
			}
			logger.debug(`Diff: Segment ${segmentId} changed`)
			changes.push(
				literal<PlaylistChangeSegmentChanged>({
					type: PlaylistChangeType.PlaylistChangeSegmentChanged,
					rundownExternalId: rundown.externalId,
					segmentExternalId: segmentId,
				})
			)
		}
	}

	if (changes.length) {
		changes.push(
			literal<PlaylistChangeRundownMetaDataUpdated>({
				type: PlaylistChangeType.PlaylistChangeRundownMetaDataUpdated,
				rundownExternalId: rundown.externalId,
			})
		)
	}

	return {
		playlistChanges: changes,
		segmentChanges: {
			movedSegments,
			notMovedSegments,
			insertedSegments,
			deletedSegments,
			changedSegments,
		},
	}
}
