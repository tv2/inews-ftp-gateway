
export interface IAeCodes {
	aeCommand: string
	text: Array<string>
}

export class AeCodes {
	static extract (aeset: any[]): IAeCodes[] {
		let aeList: IAeCodes[] = []

		try {
			if (aeset[0].ae.length > 0) {
				aeList = aeset[0].ae.map((ae: any) => {
					return ({
						aeCommand: ae.ap[1] || '',
						text: ae.ap.filter((item: string, index: number) => {
							if (index > 1) {
								return { text: item }
							} else {
								return
							}
						})
					})
				})
			}
		} catch {
			console.log('DUMMY LOG : ', aeset)
		}
		return aeList
	}
}
