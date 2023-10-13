import { logger } from '../logger'
import { INewsRundown } from '../classes/datastructures/Rundown'
import { literal } from '../helpers'
import { GetMovedSegments } from './GetMovedSegments'
import { RundownId, SegmentId } from './id'
import { RundownSegment } from '../classes/datastructures/Segment'

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

export interface PlaylistChangeRundownDeleted extends PlaylistChangeBase {
	type: PlaylistChangeType.PlaylistChangeRundownDeleted
	rundownExternalId: string
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
	| PlaylistChangeRundownDeleted
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

export type SegmentChangesMap = Map<RundownId, SegmentChanges>

export function DiffPlaylist(
	newINewsRundowns: Array<INewsRundown>,
	previousINewsRundowns: Array<INewsRundown>
): {
	changes: PlaylistChange[]
	segmentChanges: SegmentChangesMap
} {
	let changes: PlaylistChange[] = []
	let segmentChanges: SegmentChangesMap = new Map()
	let updatedRundownMetaData: Set<RundownId> = new Set()

	// Check if a Rundown has been removed/deleted.
	for (let previousRundown of previousINewsRundowns) {
		let newRundown = newINewsRundowns.find((p) => p.externalId === previousRundown.externalId)
		if (!newRundown) {
			logger.debug(`Diff: Rundown ${previousRundown.externalId} deleted`)
			changes.push(
				literal<PlaylistChangeRundownDeleted>({
					type: PlaylistChangeType.PlaylistChangeRundownDeleted,
					rundownExternalId: previousRundown.externalId,
				})
			)
			segmentChanges.set(previousRundown.externalId, {
				movedSegments: [],
				notMovedSegments: [],
				insertedSegments: [],
				deletedSegments: previousRundown.segments.map((s) => s.externalId),
				changedSegments: [],
			})
			continue
		}
	}

	for (let newRundown of newINewsRundowns) {
		const previousRundown = previousINewsRundowns.find((p) => p.externalId === newRundown.externalId)
		// Checks if a Rundown has been added/created
		if (!previousRundown) {
			logger.debug(`Diff: Rundown ${newRundown.externalId} created`)
			changes.push(
				literal<PlaylistChangeRundownCreated>({
					type: PlaylistChangeType.PlaylistChangeRundownCreated,
					rundownExternalId: newRundown.externalId,
				})
			)
			segmentChanges.set(newRundown.externalId, {
				movedSegments: [],
				notMovedSegments: [],
				insertedSegments: newRundown.segments.map((s) => s.externalId),
				deletedSegments: [],
				changedSegments: [],
			})
			continue
		}

		if (previousRundown.payload?.showstyleVariant !== newRundown.payload?.showstyleVariant) {
			changes.push(
				literal<PlaylistChangeRundownUpdated>({
					type: PlaylistChangeType.PlaylistChangeRundownUpdated,
					rundownExternalId: newRundown.externalId,
				})
			)
			updatedRundownMetaData.add(newRundown.externalId)
		}

		let { movedSegments, notMovedSegments, insertedSegments, deletedSegments } = GetMovedSegments(
			previousRundown.segments.map((s) => s.externalId),
			newRundown.segments.map((s) => s.externalId)
		)
		let changedSegments: SegmentId[] = []

		movedSegments.forEach((s) => {
			logger.debug(`Diff: Segment ${s} moved`)
			changes.push(
				literal<PlaylistChangeSegmentMoved>({
					type: PlaylistChangeType.PlaylistChangeSegmentMoved,
					rundownExternalId: newRundown.externalId,
					segmentExternalId: s,
				})
			)
			updatedRundownMetaData.add(newRundown.externalId)
		})

		insertedSegments.forEach((s) => {
			logger.debug(`Diff: Segment ${s} inserted`)
			changes.push(
				literal<PlaylistChangeSegmentCreated>({
					type: PlaylistChangeType.PlaylistChangeSegmentCreated,
					rundownExternalId: newRundown.externalId,
					segmentExternalId: s,
				})
			)
			updatedRundownMetaData.add(newRundown.externalId)
		})

		deletedSegments.forEach((s) => {
			logger.debug(`Diff: Segment ${s} deleted`)
			changes.push(
				literal<PlaylistChangeSegmentDeleted>({
					type: PlaylistChangeType.PlaylistChangeSegmentDeleted,
					rundownExternalId: newRundown.externalId,
					segmentExternalId: s,
				})
			)
			updatedRundownMetaData.add(newRundown.externalId)
		})

		// Find segments that have changed, rather than staying put / just being moved
		const segmentsToCheckForChanges = [...movedSegments, ...notMovedSegments]
		for (const segmentId of segmentsToCheckForChanges) {
			const newSegment: RundownSegment | undefined = newRundown.segments.find((s) => s.externalId === segmentId)
			const previousSegment: RundownSegment | undefined = previousRundown.segments.find(
				(s) => s.externalId === segmentId
			)

			if (!newSegment || !previousSegment) continue

			if (JSON.stringify(previousSegment.serialize()) !== JSON.stringify(newSegment.serialize())) {
				if (!changedSegments.includes(segmentId)) {
					changedSegments.push(segmentId)
				}
				logger.debug(`Diff: Segment ${segmentId} changed`)
				changes.push(
					literal<PlaylistChangeSegmentChanged>({
						type: PlaylistChangeType.PlaylistChangeSegmentChanged,
						rundownExternalId: newRundown.externalId,
						segmentExternalId: segmentId,
					})
				)
				updatedRundownMetaData.add(newRundown.externalId)
			}
		}

		segmentChanges.set(newRundown.externalId, {
			movedSegments,
			notMovedSegments,
			insertedSegments,
			deletedSegments,
			changedSegments,
		})
	}

	for (const rundownId of updatedRundownMetaData) {
		changes.push(
			literal<PlaylistChangeRundownMetaDataUpdated>({
				type: PlaylistChangeType.PlaylistChangeRundownMetaDataUpdated,
				rundownExternalId: rundownId,
			})
		)
	}

	return { changes, segmentChanges }
}
