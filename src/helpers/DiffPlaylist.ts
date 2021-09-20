import { INewsRundown } from '../classes/datastructures/Rundown'
import { literal } from '../helpers'
import { GetMovedSegments } from './GetMovedSegments'
import { RundownId, SegmentId } from './id'

export enum PlaylistChangeType {
	PlaylistChangeSegmentDeleted = 'segment_deleted',
	PlaylistChangeSegmentCreated = 'segment_created',
	PlaylistChangeSegmentChanged = 'segment_changed',
	PlaylistChangeSegmentMoved = 'segment_moved',
	PlaylistChangeRundownDeleted = 'rundown_deleted',
	PlaylistChangeRundownCreated = 'rundown_created',
	PlaylistChangeRundownUpdated = 'rundown_updated',
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

export type PlaylistChange =
	| PlaylistChangeSegmentCreated
	| PlaylistChangeSegmentDeleted
	| PlaylistChangeSegmentChanged
	| PlaylistChangeSegmentMoved
	| PlaylistChangeRundownCreated
	| PlaylistChangeRundownDeleted
	| PlaylistChangeRundownUpdated

export type SegmentChangesMap = Map<
	RundownId,
	{
		// rundownId: changes
		movedSegments: SegmentId[]
		notMovedSegments: SegmentId[]
		insertedSegments: SegmentId[]
		deletedSegments: SegmentId[]
		changedSegments: SegmentId[]
	}
>

export function DiffPlaylist(
	playlist: Array<INewsRundown>,
	previous: Array<INewsRundown>
): {
	changes: PlaylistChange[]
	segmentChanges: SegmentChangesMap
} {
	let changes: PlaylistChange[] = []
	let segmentChanges: SegmentChangesMap = new Map()

	for (let rundown of previous) {
		let newRundown = playlist.find((p) => p.externalId === rundown.externalId)
		if (!newRundown) {
			changes.push(
				literal<PlaylistChangeRundownDeleted>({
					type: PlaylistChangeType.PlaylistChangeRundownDeleted,
					rundownExternalId: rundown.externalId,
				})
			)
			segmentChanges.set(rundown.externalId, {
				movedSegments: [],
				notMovedSegments: [],
				insertedSegments: [],
				deletedSegments: rundown.segments.map((s) => s.externalId),
				changedSegments: [],
			})
			continue
		}
	}

	for (let rundown of playlist) {
		const prevRundown = previous.find((p) => p.externalId === rundown.externalId)
		if (!prevRundown) {
			changes.push(
				literal<PlaylistChangeRundownCreated>({
					type: PlaylistChangeType.PlaylistChangeRundownCreated,
					rundownExternalId: rundown.externalId,
				})
			)
			segmentChanges.set(rundown.externalId, {
				movedSegments: [],
				notMovedSegments: [],
				insertedSegments: rundown.segments.map((s) => s.externalId),
				deletedSegments: [],
				changedSegments: [],
			})
			continue
		}

		if (prevRundown.backTime !== rundown.backTime) {
			changes.push(
				literal<PlaylistChangeRundownUpdated>({
					type: PlaylistChangeType.PlaylistChangeRundownUpdated,
					rundownExternalId: rundown.externalId,
				})
			)

			segmentChanges.set(rundown.externalId, {
				movedSegments: [],
				notMovedSegments: [],
				insertedSegments: rundown.segments.map((s) => s.externalId),
				deletedSegments: [],
				changedSegments: [],
			})
			continue
		}

		let { movedSegments, notMovedSegments, insertedSegments, deletedSegments } = GetMovedSegments(
			prevRundown.segments.map((s) => s.externalId),
			rundown.segments.map((s) => s.externalId)
		)
		let changedSegments: SegmentId[] = []

		movedSegments.forEach((s) =>
			changes.push(
				literal<PlaylistChangeSegmentMoved>({
					type: PlaylistChangeType.PlaylistChangeSegmentMoved,
					rundownExternalId: rundown.externalId,
					segmentExternalId: s,
				})
			)
		)

		insertedSegments.forEach((s) =>
			changes.push(
				literal<PlaylistChangeSegmentCreated>({
					type: PlaylistChangeType.PlaylistChangeSegmentCreated,
					rundownExternalId: rundown.externalId,
					segmentExternalId: s,
				})
			)
		)

		deletedSegments.forEach((s) =>
			changes.push(
				literal<PlaylistChangeSegmentDeleted>({
					type: PlaylistChangeType.PlaylistChangeSegmentDeleted,
					rundownExternalId: rundown.externalId,
					segmentExternalId: s,
				})
			)
		)

		// Find segments that have changed, rather than staying put / just being moved
		const segmentsToCheckForChanges = [...movedSegments, ...notMovedSegments]
		for (const segmentId of segmentsToCheckForChanges) {
			const current = rundown.segments.find((s) => s.externalId === segmentId)
			const prev = prevRundown.segments.find((s) => s.externalId === segmentId)

			if (!current || !prev) continue

			if (JSON.stringify(prev.serialize()) !== JSON.stringify(current.serialize())) {
				if (!changedSegments.includes(segmentId)) {
					changedSegments.push(segmentId)
				}
				changes.push(
					literal<PlaylistChangeSegmentChanged>({
						type: PlaylistChangeType.PlaylistChangeSegmentChanged,
						rundownExternalId: rundown.externalId,
						segmentExternalId: segmentId,
					})
				)
			}
		}

		segmentChanges.set(rundown.externalId, {
			movedSegments,
			notMovedSegments,
			insertedSegments,
			deletedSegments,
			changedSegments,
		})
	}

	return { changes, segmentChanges }
}
