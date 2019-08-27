
export interface IPiCodes {
	piCommand: string
	arguments: Array<string>
}

export const PI_CODE_TYPES = [
	'***VOSB',
	'***SERVER',
	'***VO ',
	'KAM '
]

export class BodyCodes {
	static extract (bodyList: any[]): { piCodes: IPiCodes[], script: string } {
		let piCodes: IPiCodes[] = []

		let script = ''
		bodyList[0].p.map((line: any) => {
			if (typeof(line) === 'string') {
				script = script + line + '\n'
			} else if (typeof(line) === 'object') {
				if (line.pi || false) {
					// Find Codetype and add to piCodes[]
					piCodes.push({
						piCommand: String(PI_CODE_TYPES.filter((type: any) => type.includes(line.pi))),
						arguments: line.pi
					})
					script = script + line.pi + '\n'
				} else if (line.cc) {
					console.log('DUMMY LOG : ', line.cc)
				}
			}
		})

		return ({
			piCodes: piCodes,
			script: script
		})
	}
}
