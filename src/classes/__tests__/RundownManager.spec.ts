import { RundownManager } from '../RundownManager'
import { INewsStoryGW } from '../datastructures/Segment'

const LAYOUT: string = 'n'

let testee: RundownManager

describe('RundownManager', () => {
	beforeEach(() => {
		testee = new RundownManager()
	})

	describe('generateCuesFromLayoutField', () => {
		it('has no layout, dont generate anything', () => {
			const story: INewsStoryGW = createStory()

			const before = { ...story }
			testee.generateCuesFromLayoutField(story)
			expect(story).toEqual(before)
		})

		it('has a layout, designLayout cue is added', () => {
			const story = createStory(LAYOUT)

			expect(story.cues.some((cue) => cue!.some((line) => line.match(/DESIGN_LAYOUT=/i)))).toBeFalsy()
			testee.generateCuesFromLayoutField(story)
			expect(story.cues.some((cue) => cue!.some((line) => line.match(/DESIGN_LAYOUT=/i)))).toBeTruthy()
		})

		it('has the upper cased layout value in the design cue', () => {
			const story: INewsStoryGW = createStory(LAYOUT)

			testee.generateCuesFromLayoutField(story)

			expect(story.cues[0]![0]).toBe(`DESIGN_LAYOUT=${LAYOUT.toUpperCase()}`)
		})

		it('has a layout, link to cue is generated in body', () => {
			const story: INewsStoryGW = createStory(LAYOUT)

			testee.generateCuesFromLayoutField(story)
			expect(story.body).toMatch(/<a(.*?)<\/a>/i)
		})

		it('has one cue already, new cue link references index 2', () => {
			testCorrectCueReferenceInLink(1)
		})

		it('has two cues already, new cue link references index 3', () => {
			testCorrectCueReferenceInLink(2)
		})

		it('has fourteen cues already, new cue link references index 15', () => {
			testCorrectCueReferenceInLink(14)
		})

		it('inserts the cue link right after the first <pi> tag', () => {
			const body: string = `<p><pi></pi></p>\r\n<p></p>\r\n`
			const story = createStory('n', body)

			testee.generateCuesFromLayoutField(story)

			const lines = story.body!.split('\r\n')
			const index = lines.findIndex((line) => line.match('<pi>'))
			expect(lines[index + 1]).toMatch(/<a(.*?)<\/a>/i)
		})

		it('already have design cue, remove link to cue', () => {
			const body = '<p></p>\r\n</p><p><a idref="0"></a></p>'
			const designCueFromBody = ['KG=DESIGN_OL']
			const story = createStory(LAYOUT, body)
			story.cues.push(designCueFromBody)

			testee.generateCuesFromLayoutField(story)

			expect(story.body!.match(/<\a idref="0"><\/a>/i)).toBeFalsy()
		})

		it('already have design cue, but no layout, dont remove link to cue', () => {
			const body = '<p></p>\r\n</p><p><a idref="0"></a></p>'
			const designCueFromBody = ['KG=DESIGN_OL']
			const story = createStory(undefined, body)
			story.cues.push(designCueFromBody)

			testee.generateCuesFromLayoutField(story)

			expect(story.body!.match(/<\a idref="0"><\/a>/i)).toBeTruthy()
		})

		it('adds a DESIGN_BG to cues', () => {
			const story = createStory(LAYOUT)

			expect(story.cues.some((cue) => cue!.some((line) => line.match(/DESIGN_BG=/i)))).toBeFalsy()
			testee.generateCuesFromLayoutField(story)
			expect(story.cues.some((cue) => cue!.some((line) => line.match(/DESIGN_BG=/i)))).toBeTruthy()
		})

		it('assigns the upper cased layout value to the DESIGN_BG cue', () => {
			const story = createStory(LAYOUT)

			testee.generateCuesFromLayoutField(story)

			expect(
				story.cues.some((cue) => cue!.some((line) => line.match(`DESIGN_BG=${LAYOUT.toUpperCase()}`)))
			).toBeTruthy()
		})

		it('adds link to DESIGN_BG cue', () => {
			const story = createStory(LAYOUT)

			testee.generateCuesFromLayoutField(story)

			const cueIndex = story.cues!.findIndex((cue) => cue!.some((line) => line.match(/DESIGN_BG=/i)))
			expect(story.body!.match(`<\a idref="${cueIndex}"><\\/a>`)).toBeTruthy()
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

function testCorrectCueReferenceInLink(numberOfExistingCues: number): void {
	const story: INewsStoryGW = createStory(LAYOUT)
	for (let i = 0; i < numberOfExistingCues; i++) {
		story.cues.push([`cue${i}`])
	}

	testee.generateCuesFromLayoutField(story)
	expect(story.body!.match(`<\a idref="${numberOfExistingCues + 1}"><\\/a>`)).toBeTruthy()
}
