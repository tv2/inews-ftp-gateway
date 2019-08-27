
export interface IKgCodes {
	kgCommand: string
	text1: string
	text2: string
	text3: string
	timeStart: number
	timeDuration: number
}

export class KgCodes {
	static extract (aeset: any[]): IKgCodes[] {
		console.log('DUMMY LOG : ', aeset)
		return [{
			kgCommand: 'string',
			text1: 'string',
			text2: 'string',
			text3: 'string',
			timeStart: 1,
			timeDuration: 5
		}]
	}
}