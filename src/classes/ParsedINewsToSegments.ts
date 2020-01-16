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
	[segmentId: string]: number
}

export class ParsedINewsIntoSegments {

	static parse (rundownId: string, inewsRaw: INewsStoryGW[], previousRankings: SegmentRankings): RundownSegment[] {
		let segments: RundownSegment[] = []

		let rank = 1
		let movedPieces = 0
		let lastKnownIdent = ''
		inewsRaw.forEach((rawSegment) => {
			if (Object.keys(previousRankings).includes(rawSegment.identifier)) {
				// Segment hasn't moved
				if (rank - movedPieces === previousRankings[rawSegment.identifier]) {
					segments.push(
						new RundownSegment(
							rundownId,
							rawSegment,
							rawSegment.fields.modifyDate,
							rawSegment.id || `${rawSegment.identifier}`,
							rank - movedPieces,
							rawSegment.fields.title || '',
							false
						)
					)
					rank += 1
					lastKnownIdent = rawSegment.identifier
				} else {
					segments.push(
						new RundownSegment(
							rundownId,
							rawSegment,
							rawSegment.fields.modifyDate,
							rawSegment.id || `${rawSegment.identifier}`,
							(rank - 1 + this.findNextDefinedRank(lastKnownIdent, previousRankings)) / 2,
							rawSegment.fields.title || '',
							false
						)
					)

					rank += 1
					movedPieces += 1
				}
			} else {
				let newrank = this.findNextDefinedRank(lastKnownIdent, previousRankings)

				if (segments.some(segment => segment.rank === newrank) || Object.values(lastKnownIdent).indexOf(newrank.toString())) {
					newrank = (this.getLastKnownRank(lastKnownIdent, previousRankings) + this.findNextDefinedRank(lastKnownIdent, previousRankings)) / 2
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
				segments.push(segment)
			}
		})

		return segments.sort((a, b) => a.rank < b.rank ? -1 : 1)
	}

	static findNextDefinedRank (lastKnownIdent: string, previousRanks: SegmentRankings): number {
		if (!Object.keys(previousRanks).length) {
			return 1
		}

		if (!lastKnownIdent.length) {
			return previousRanks[Object.keys(previousRanks)[0]]
		}

		const lastPosition = Object.keys(previousRanks).indexOf(lastKnownIdent)

		if (lastPosition === -1) {
			return 1
		}

		const nextPosition = previousRanks[Object.keys(previousRanks)[lastPosition + 1]]

		if (nextPosition) {
			return nextPosition
		}

		return previousRanks[Object.keys(previousRanks)[lastPosition]] + 1
	}

	static getLastKnownRank (lastKnownIdent: string, previousRanks: SegmentRankings): number {
		if (!Object.keys(previousRanks).length) {
			return 0
		}

		const val = previousRanks[lastKnownIdent]

		// tslint:disable-next-line: strict-type-predicates
		if (val !== undefined) return val

		return 0
	}

}
