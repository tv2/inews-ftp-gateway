import { RundownSegment, INewsStoryGW } from './datastructures/Segment'

export interface IParsedElement {
	data: {
		id?: string
		name?: string
		type?: string
		float: string
		script?: string
		objectType?: string
		duration?: string
		clipName?: string
	}
}

export interface SegmentRankings {
	[segmentId: string]: {
		/** Assigned rank */
		rank: number,
		/** Position in arra */
		position: number
	}
}

export class ParsedINewsIntoSegments {

	static parse (rundownId: string, inewsRaw: INewsStoryGW[], previousRankings: SegmentRankings): RundownSegment[] {
		let segments: RundownSegment[] = []

		if (inewsRaw.some(rawSegment => rawSegment.identifier === undefined)) {
			return segments
		}

		// Initial startup of gateway
		let pad = 10
		if (JSON.stringify(previousRankings) === JSON.stringify({})) {
			inewsRaw.forEach((rawSegment) => {
				if (!rawSegment.identifier) {
					pad += 1
					return
				}

				segments.push(
					new RundownSegment(
						rundownId,
						rawSegment,
						rawSegment.fields.modifyDate,
						rawSegment.id || `${rawSegment.identifier}`,
						pad * 100, // Offset from 0 to allow for stories arriving out of order
						rawSegment.fields.title || '',
						false
					)
				)
				pad += 10
			})
			return segments
		}

		let rank = 1
		let movedPieces = 0
		let lastKnownIdent = ''
		let lastAssignedRank = 0
		inewsRaw.forEach((rawSegment) => {
			if (!rawSegment.identifier) {
				return
			}
			// Segment previously existed
			if (Object.keys(previousRankings).includes(rawSegment.identifier)) {

				// Segment hasn't moved
				if (rank - movedPieces === previousRankings[rawSegment.identifier].position) {
					segments.push(
						new RundownSegment(
							rundownId,
							rawSegment,
							rawSegment.fields.modifyDate,
							rawSegment.id || `${rawSegment.identifier}`,
							previousRankings[rawSegment.identifier].rank,
							rawSegment.fields.title || '',
							false
						)
					)
					lastAssignedRank = previousRankings[rawSegment.identifier].rank
					rank += 1
					lastKnownIdent = rawSegment.identifier
					movedPieces = 0
				} else {
					segments.push(
						new RundownSegment(
							rundownId,
							rawSegment,
							rawSegment.fields.modifyDate,
							rawSegment.id || `${rawSegment.identifier}`,
							(rank - 1 + this.findNextDefinedRank(lastKnownIdent, previousRankings, lastAssignedRank)) / 2,
							rawSegment.fields.title || '',
							false
						)
					)

					lastAssignedRank = (rank - 1 + this.findNextDefinedRank(lastKnownIdent, previousRankings, lastAssignedRank)) / 2
					rank += 1
					movedPieces += 1
					lastKnownIdent = rawSegment.identifier
				}
			} else {
				let newrank = this.findNextDefinedRank(lastKnownIdent, previousRankings, lastAssignedRank)

				let lastAttempt = newrank
				while (segments.some(segment => segment.rank === newrank) || Object.values(previousRankings).some(rank => rank.rank === newrank)) {
					newrank = (lastAssignedRank + lastAttempt) / 2
					lastAttempt = newrank
				}

				let story = rawSegment
				let segment = new RundownSegment(
					rundownId,
					story,
					story.fields.modifyDate,
					story.id || `${rawSegment.identifier}`,
					newrank,
					story.fields.title || '',
					false
				)
				lastAssignedRank = newrank
				lastKnownIdent = rawSegment.identifier
				segments.push(segment)
			}
		})

		return segments.sort((a, b) => a.rank < b.rank ? -1 : 1)
	}

	static findNextDefinedRank (lastKnownIdent: string, previousRanks: SegmentRankings, lastAssignedRank: number): number {
		if (!Object.keys(previousRanks).length) {
			return Math.floor(lastAssignedRank + 1)
		}

		if (!lastKnownIdent.length) {
			return previousRanks[Object.keys(previousRanks)[0]].rank
		}

		const lastPosition = Object.keys(previousRanks).indexOf(lastKnownIdent)

		if (lastPosition === -1) {
			return Math.floor(lastAssignedRank + 1)
		}

		const nextPosition = previousRanks[Object.keys(previousRanks)[lastPosition + 1]]

		if (nextPosition) {
			return nextPosition.rank
		}

		return previousRanks[Object.keys(previousRanks)[lastPosition]].rank + 1
	}

	static getLastKnownRank (lastKnownIdent: string, previousRanks: SegmentRankings): number {
		if (!Object.keys(previousRanks).length) {
			return 0
		}

		const val = previousRanks[lastKnownIdent]

		// tslint:disable-next-line: strict-type-predicates
		if (val !== undefined) return val.rank

		return 0
	}

}
