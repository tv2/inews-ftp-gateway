import { RundownManager } from '../RundownManager'
import { INewsStoryGW } from '../datastructures/Segment'
import { INewsFields } from 'inews'

const LAYOUT: string = 'n'
const FIELD_WITH_LAYOUT: INewsFields = { layout: LAYOUT }
const SCHEMA: string = 'NE'
const FIELD_WITH_SCHEMA: INewsFields = { skema: SCHEMA }

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
			const story = createStory(FIELD_WITH_LAYOUT)

			expect(story.cues.some((cue) => cue!.some((line) => line.match(/DESIGN_FIELD=/i)))).toBeFalsy()
			testee.generateCuesFromLayoutField(story)
			expect(story.cues.some((cue) => cue!.some((line) => line.match(/DESIGN_FIELD=/i)))).toBeTruthy()
		})

		it('has the upper cased layout value in the design cue', () => {
			const story: INewsStoryGW = createStory(FIELD_WITH_LAYOUT)

			testee.generateCuesFromLayoutField(story)

			expect(story.cues[0]![0]).toBe(`DESIGN_FIELD=${LAYOUT.toUpperCase()}`)
		})

		it('has a layout, link to cue is generated in body', () => {
			const story: INewsStoryGW = createStory(FIELD_WITH_LAYOUT)

			testee.generateCuesFromLayoutField(story)
			expect(story.body).toMatch(/<a(.*?)<\/a>/i)
		})

		it('has one cue already, new cue link references index 1', () => {
			testCorrectCueReferenceInLinkForDesign(1)
		})

		it('has two cues already, new cue link references index 2', () => {
			testCorrectCueReferenceInLinkForDesign(2)
		})

		it('has fourteen cues already, new cue link references index 14', () => {
			testCorrectCueReferenceInLinkForDesign(14)
		})

		it('inserts the cue link right after the first <pi> tag', () => {
			const body: string = `<p><pi></pi></p>\r\n<p></p>\r\n`
			const story = createStory(FIELD_WITH_LAYOUT, body)

			testee.generateCuesFromLayoutField(story)

			const lines = story.body!.split('\r\n')
			const index = lines.findIndex((line) => line.match('<pi>'))
			expect(lines[index + 1]).toMatch(/<a(.*?)<\/a>/i)
		})

		it('adds a DESIGN_BG to cues', () => {
			const story = createStory(FIELD_WITH_LAYOUT)

			expect(story.cues.some((cue) => cue!.some((line) => line.match(/DESIGN_BG=/i)))).toBeFalsy()
			testee.generateCuesFromLayoutField(story)
			expect(story.cues.some((cue) => cue!.some((line) => line.match(/DESIGN_BG=/i)))).toBeTruthy()
		})

		it('assigns the upper cased layout value to the DESIGN_BG cue', () => {
			const story = createStory(FIELD_WITH_LAYOUT)

			testee.generateCuesFromLayoutField(story)

			expect(
				story.cues.some((cue) => cue!.some((line) => line.match(`DESIGN_BG=${LAYOUT.toUpperCase()}`)))
			).toBeTruthy()
		})

		it('adds link to DESIGN_BG cue', () => {
			const story = createStory(FIELD_WITH_LAYOUT)

			testee.generateCuesFromLayoutField(story)

			const cueIndex = story.cues!.findIndex((cue) => cue!.some((line) => line.match(/DESIGN_BG=/i)))
			expect(story.body!.match(`<\a idref="${cueIndex}"><\\/a>`)).toBeTruthy()
		})
	})

	describe('generateCueFromSchemaField', () => {
		it('has no schema, dont generate anything', () => {
			const story: INewsStoryGW = createStory()

			const before = { ...story }
			testee.generateCueFromSchemaField(story)
			expect(story).toEqual(before)
		})

		it('has a schema, schemaField cue is added', () => {
			const story = createStory(FIELD_WITH_SCHEMA)

			expect(story.cues.some((cue) => cue!.some((line) => line.match(/SCHEMA_FIELD=/i)))).toBeFalsy()
			testee.generateCueFromSchemaField(story)
			expect(story.cues.some((cue) => cue!.some((line) => line.match(/SCHEMA_FIELD=/i)))).toBeTruthy()
		})

		it('has the upper cased field value in the schema cue', () => {
			const story: INewsStoryGW = createStory(FIELD_WITH_SCHEMA)

			testee.generateCueFromSchemaField(story)

			expect(story.cues[0]![0]).toBe(`SCHEMA_FIELD=${SCHEMA.toUpperCase()}`)
		})

		it('has a field, link to cue is generated in body', () => {
			const story: INewsStoryGW = createStory(FIELD_WITH_SCHEMA)

			testee.generateCueFromSchemaField(story)
			expect(story.body).toMatch(/<a(.*?)<\/a>/i)
		})

		it('has one cue already, new cue link references index 1', () => {
			testCorrectCueReferenceInLinkForSchema(1)
		})

		it('has two cues already, new cue link references index 2', () => {
			testCorrectCueReferenceInLinkForSchema(2)
		})

		it('has fourteen cues already, new cue link references index 14', () => {
			testCorrectCueReferenceInLinkForSchema(14)
		})

		it('inserts the cue link right after the first <pi> tag', () => {
			const body: string = `<p><pi></pi></p>\r\n<p></p>\r\n`
			const story = createStory(FIELD_WITH_SCHEMA, body)

			testee.generateCueFromSchemaField(story)

			const lines = story.body!.split('\r\n')
			const index = lines.findIndex((line) => line.match('<pi>'))
			expect(lines[index + 1]).toMatch(/<a(.*?)<\/a>/i)
		})
	})
})

function createStory(fields?: INewsFields, body?: string): INewsStoryGW {
	return {
		id: '',
		identifier: '',
		fields: fields ?? {},
		body: body ? body : '<p></p>',
		cues: [],
		locator: '',
		meta: {},
	}
}

function testCorrectCueReferenceInLinkForDesign(numberOfExistingCues: number): void {
	const story = createStoryWithExistingCues(numberOfExistingCues, FIELD_WITH_LAYOUT)
	testee.generateCuesFromLayoutField(story)
	assertCueAtIndexInStory(numberOfExistingCues, story)
}

function createStoryWithExistingCues(numberOfExistingCues: number, fields: INewsFields): INewsStoryGW {
	const story: INewsStoryGW = createStory(fields)
	for (let i = 0; i < numberOfExistingCues; i++) {
		story.cues.push([`cue${i}`])
	}
	return story
}

function assertCueAtIndexInStory(cueIndex: number, story: INewsStoryGW): void {
	expect(story.body!.match(`<\a idref="${cueIndex}"><\\/a>`)).toBeTruthy()
}

function testCorrectCueReferenceInLinkForSchema(numberOfExistingCues: number): void {
	const story = createStoryWithExistingCues(numberOfExistingCues, FIELD_WITH_SCHEMA)
	testee.generateCueFromSchemaField(story)
	assertCueAtIndexInStory(numberOfExistingCues, story)
}
