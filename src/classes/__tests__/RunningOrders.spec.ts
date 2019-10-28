let fs = require('fs')
let ftpData = JSON.parse(fs.readFileSync('src/classes/__tests__/__mocks__/ftpData.json'))
let parsedData = JSON.parse(fs.readFileSync('src/classes/__tests__/__mocks__/parsedData.json'))
import { InewsRundown } from '../datastructures/Rundown'
import winston = require('winston')
import { RundownManager } from '../RundownManager'

describe('RunningOrders', () => {

	it('should exist', () => {
		let a = new InewsRundown('test', 'some name', 'v0.2')
		expect(a).toBeTruthy()
	})
})

describe('RundownManager', () => {
	it('SplitRawDataToElements', () => {
		let id = '00000000000001'
		let logger = new winston.Logger()
		let manager = new RundownManager(logger, {})
		let managerParsedData = manager.convertRawtoSofie(logger, id, id, JSON.parse(JSON.stringify(ftpData)))
		// Uncomment to update parsedData:
		// fs.writeFileSync('src/classes/__tests__/__mocks__/updatedParsedData.json', JSON.stringify(managerParsedData))
		expect(managerParsedData).toEqual(parsedData)
	})
})
