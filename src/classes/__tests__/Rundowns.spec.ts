import { INewsRundown } from '../datastructures/Rundown'
import { VERSION } from '../../version'

describe('Rundowns', () => {
	it('should exist', () => {
		let a = new INewsRundown('test', 'some name', VERSION)
		expect(a).toBeTruthy()
	})
})
