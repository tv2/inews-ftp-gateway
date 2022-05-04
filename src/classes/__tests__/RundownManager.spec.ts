import { RundownManager } from '../RundownManager'
import { INewsStoryGW } from '../datastructures/Segment'

const LAYOUT: string = 'n'

let testee: RundownManager

describe('RundownManager', () => {
	describe('generateDesignCuesFromFields', () => {
		beforeEach(() => {
			testee = new RundownManager()
		})

		it('has no layout, dont generate anything', () => {
			const story: INewsStoryGW = createStory()

			const before = { ...story }
			testee.generateDesignCuesFromFields(story)
			expect(story).toEqual(before)
		})

		it('has a layout, designLayout cue is added', () => {
			const story: INewsStoryGW = createStory(LAYOUT)
			const amountOfCuesBefore: number = story.cues.length

			testee.generateDesignCuesFromFields(story)
			expect(story.cues.length).toBe(amountOfCuesBefore + 1)
		})

		it('has the upper cased layout value in the design cue', () => {
			const story: INewsStoryGW = createStory(LAYOUT)

			testee.generateDesignCuesFromFields(story)

			expect(story.cues[0]![0]).toBe(`DESIGN_LAYOUT=${LAYOUT.toUpperCase()}`)
		})

		it('has a layout, link to cue is generated in body', () => {
			const story: INewsStoryGW = createStory(LAYOUT)

			testee.generateDesignCuesFromFields(story)
			expect(story.body).toMatch(/<a(.*?)<\/a>/i)
		})

		it('has one cue already, new cue link references index 1', () => {
			testCorrectCueReferenceInLink(1)
		})

		it('has two cues already, new cue link references index 2', () => {
			testCorrectCueReferenceInLink(2)
		})

		it('has fourteen cues already, new cue link references index 14', () => {
			testCorrectCueReferenceInLink(2)
		})

		it('inserts the cue link right after the first <pi> tag', () => {
			const body: string = `<p><pi></pi></p>\r\n<p></p>\r\n`
			const story = createStory('n', body)

			testee.generateDesignCuesFromFields(story)

			const lines = story.body!.split('\r\n')
			const index = lines.findIndex((line) => line.match('<pi>'))
			expect(lines[index + 1]).toMatch(/<a(.*?)<\/a>/i)
		})

		it('already have design cue, remove link to cue', () => {
			const body = '<p></p>\r\n</p><p><a idref="0"></a></p>'
			const designCueFromBody = ['KG=DESIGN_OL']
			const story = createStory(LAYOUT, body)
			story.cues.push(designCueFromBody)

			testee.generateDesignCuesFromFields(story)

			expect(story.body!.match(/<\a idref="0"><\/a>/i)).toBeFalsy()
		})

		it('already have design cue, but no layout, dont remove link to cue', () => {
			const body = '<p></p>\r\n</p><p><a idref="0"></a></p>'
			const designCueFromBody = ['KG=DESIGN_OL']
			const story = createStory(undefined, body)
			story.cues.push(designCueFromBody)

			testee.generateDesignCuesFromFields(story)

			expect(story.body!.match(/<\a idref="0"><\/a>/i)).toBeTruthy()
		})
	})
})

function createStory(layout?: string, body?: string): INewsStoryGW {
	return {
		id: '',
		identifier: '',
		fields: layout ? { layout } : {},
		body: body ? body : '<p></p>',
		cues: [],
		locator: '',
		meta: {},
	}
}

function testCorrectCueReferenceInLink(numberOfCues: number): void {
	const story: INewsStoryGW = createStory(LAYOUT)
	for (let i = 0; i < numberOfCues; i++) {
		story.cues.push([`cue${i}`])
	}

	testee.generateDesignCuesFromFields(story)
	expect(story.body!.match(`<\a idref="${numberOfCues}"><\\/a>`)).toBeTruthy()
}
