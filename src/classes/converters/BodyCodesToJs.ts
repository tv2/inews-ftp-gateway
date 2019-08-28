import { ELEMENT_CODE_TYPES, IElementCodes } from '../SplitRawDataToElements'

export class BodyCodes {
	static extract (bodyList: any[]): { elementCodes: IElementCodes[], script: string } {
		let elementCodes: IElementCodes[] = []

		let script = ''
		bodyList[0].p.map((line: any) => {
			if (typeof(line) === 'string') {
				script = script + line + '\n'
			} else if (typeof(line) === 'object') {
				if (line.pi || false) {
					// Find Codetype and add to piCodes[]
					if (typeof(line.pi[0]) === 'string') {
						elementCodes.push({
							elementCommand: String(ELEMENT_CODE_TYPES.filter((type: any) => line.pi[0].includes(type))[0]) || '',
							arguments: line.pi
						})
					}
					script = script + line.pi + '\n'
				} else if (line.cc) {
					console.log('DUMMY LOG : ', line.cc)
				}
			}
		})

		return ({
			elementCodes: elementCodes,
			script: script
		})
	}
}
