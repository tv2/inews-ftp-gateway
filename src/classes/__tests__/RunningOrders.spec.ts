let fs = require('fs')
let ftpData = JSON.parse(fs.readFileSync('src/classes/__tests__/__mocks__/ftpData.json'))
let parsedBodyCodes = JSON.parse(fs.readFileSync('src/classes/__tests__/__mocks__/parsedData_BodyCodes.json'))
let parsedCues = JSON.parse(fs.readFileSync('src/classes/__tests__/__mocks__/parsedData_Cues.json'))
let parsedElements = JSON.parse(fs.readFileSync('src/classes/__tests__/__mocks__/parsedData_Elements.json'))
let parsedFields = JSON.parse(fs.readFileSync('src/classes/__tests__/__mocks__/parsedData_Fields.json'))
let parsedMeta = JSON.parse(fs.readFileSync('src/classes/__tests__/__mocks__/parsedData_Meta.json'))
let parsedSegments = JSON.parse(fs.readFileSync('src/classes/__tests__/__mocks__/segments.json'))
import { InewsRundown } from '../datastructures/Rundown'
import winston = require('winston')
import { IOutputLayer } from 'tv-automation-sofie-blueprints-integration'
import { SplitRawDataToElements } from '../converters/SplitRawDataToElements'
import { ParsedElementsIntoSegments } from '../ParsedElementsToSegments'

describe('RunningOrders', () => {

	it('should exist', () => {
		let a = new InewsRundown('test', 'some name', 'v0.2', 1, 2)
		expect(a).toBeTruthy()
	})
})

let outputLayers: IOutputLayer[] = [
	{
		_id: 'pgm0',
		name: 'Program',
		_rank: 1,
		isPGM: true
	}
]

describe('RundownManager', () => {
	it('SplitRawDataToElements', () => {
		let logger = new winston.Logger()
		let parsedData = SplitRawDataToElements.convert(logger, JSON.parse(JSON.stringify(ftpData)), outputLayers)
		expect(parsedData.meta).toEqual(parsedMeta)
		expect(parsedData.fields).toEqual(parsedFields)
		expect(parsedData.bodyCodes).toEqual(parsedBodyCodes)
		expect(parsedData.cues).toEqual(parsedCues)
		expect(parsedData.elements).toEqual(parsedElements)
	})
	it('INewsRundown', () => {
		let id = '00000000000001'
		let logger = new winston.Logger()
		let parsedData = SplitRawDataToElements.convert(logger, JSON.parse(JSON.stringify(ftpData)), outputLayers)
		let rundown = new InewsRundown(id, id, parsedData.meta.version, parsedData.meta.startTime, parsedData.meta.endTime)
		expect(rundown.externalId).toEqual(id)
		expect(rundown.name).toEqual(id)
		expect(rundown.gatewayVersion).toEqual('v0.2')
		expect(rundown.expectedStart).toEqual(0)
		expect(rundown.expectedEnd).toEqual(1)
		expect(rundown.segments).toEqual([])
	})
	it('Segments', () => {
		let id = '00000000000001'
		let logger = new winston.Logger()
		let parsedData = SplitRawDataToElements.convert(logger, JSON.parse(JSON.stringify(ftpData)), outputLayers)
		let segments = ParsedElementsIntoSegments.parse(id, parsedData.elements, parsedData.fields, parsedData.bodyCodes, parsedData.cues)
		expect(segments).toEqual(parsedSegments)
	})
})
