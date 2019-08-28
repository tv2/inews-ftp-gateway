
export interface IPiCodes {
	piCommand: string
	arguments: Array<string>
}

export const PI_CODE_TYPES = [
	'KAM',
	'***SERVER',
	'***VO ',
	'***VOSB',
	'***ATTACK'
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
					if (typeof(line.pi[0]) === 'string') {
						piCodes.push({
							piCommand: String(PI_CODE_TYPES.filter((type: any) => line.pi[0].includes(type))[0]) || '',
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
			piCodes: piCodes,
			script: script
		})
	}
}
