import { InewsRundown } from '../datastructures/Rundown'

describe('RunningOrders', () => {

	it('should exist', () => {
		let a = new InewsRundown('test', 'some name', 'v0.2', 1, 2)
		expect(a).toBeTruthy()
	})
})
