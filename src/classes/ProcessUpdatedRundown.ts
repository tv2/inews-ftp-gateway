import * as Winston from 'winston'
import { RundownMap, RundownChange, RundownChangeRundownDelete, RundownChangeType, RundownChangeRundownCreate, RundownChangeRundownUpdate, RundownChangeSegmentCreate, RundownChangeSegmentDelete, RundownChangeSegmentUpdate, ReducedRundown } from './RundownWatcher'
import { literal } from '../helpers'
import _ = require('underscore')

export function ProcessUpdatedRundown (
	rundownId: string,
	rundown: ReducedRundown | null,
	rundowns: RundownMap,
	logger?: Winston.LoggerInstance
) {
	const changes: RundownChange[] = []

	const oldRundown = rundowns.get(rundownId)

	let rundownRemoved = false

	if (oldRundown && !rundown) {
		// Rundown deleted
		changes.push(
			literal<RundownChangeRundownDelete>({
				type: RundownChangeType.RUNDOWN_DELETE,
				rundownExternalId: rundownId
			})
		)
		rundownRemoved = true
		logger?.info(`Rundown ${rundownId} deleted`)
	} else if (oldRundown && rundown) {
		// Rundown properties changed
		if (!_.isEqual(oldRundown, rundown)) {
			changes.push(
				literal<RundownChangeRundownUpdate>({
					type: RundownChangeType.RUNDOWN_UPDATE,
					rundownExternalId: rundownId
				})
			)
			logger?.info(`Rundown ${rundownId} updated`)
		}
	} else if (rundown && !oldRundown) {
		// Rundown created
		changes.push(
			literal<RundownChangeRundownCreate>({
				type: RundownChangeType.RUNDOWN_CREATE,
				rundownExternalId: rundownId
			})
		)
		logger?.info(`Rundown ${rundownId} created`)
	}

	// Rundown deleted, no further action required
	if (rundownRemoved || !rundown) {
		return changes
	}

	rundown.segments.forEach(segment => {
		const oldSegment = oldRundown ? oldRundown.segments.find(s => s.externalId === segment.externalId) : undefined

		if (!oldSegment) {
			// Created
			changes.push(
				literal<RundownChangeSegmentCreate>({
					type: RundownChangeType.SEGMENT_CREATE,
					rundownExternalId: rundownId,
					segmentExternalId: segment.externalId
				})
			)
			logger?.info(`Segment ${segment.name} (${segment.externalId}) created in rundown ${rundownId}`)
		} else {
			if (!_.isEqual(oldSegment, segment)) {
				// Changed
				changes.push(
					literal<RundownChangeSegmentUpdate>({
						type: RundownChangeType.SEGMENT_UPDATE,
						rundownExternalId: rundownId,
						segmentExternalId: segment.externalId
					})
				)
				logger?.info(`Segment ${segment.name} (${segment.externalId}) updated in rundown ${rundownId}`)
			}
		}
	})

	// Find deleted segments
	oldRundown?.segments.filter(so => !rundown.segments.some(sn => sn.externalId === so.externalId)).forEach(deletedSegment => {
		changes.push(
			literal<RundownChangeSegmentDelete>({
				type: RundownChangeType.SEGMENT_DELETE,
				rundownExternalId: rundownId,
				segmentExternalId: deletedSegment.externalId
			})
		)
		logger?.info(`Segment ${deletedSegment.name} (${deletedSegment.externalId}) deleted in rundown ${rundownId}`)
	})

	return changes
}
