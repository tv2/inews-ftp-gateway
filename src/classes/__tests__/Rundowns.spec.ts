import { INewsRundown } from '../datastructures/Rundown'

describe('Rundowns', () => {
	it('should exist', () => {
		let a = new INewsRundown('test', 'some name', 'v0.2')
		expect(a).toBeTruthy()
	})
})
