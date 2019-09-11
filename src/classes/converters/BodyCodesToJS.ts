
export class BodyCodes {
	static extract (bodyString: string): { elementCodes: string[], script: string } {
		let elementCodes: string[] = []

		// Split tags into objects:
		let bodyArray: string[] = bodyString.split('\n') || []

		let script = ''
		bodyArray.forEach((line: any) => {
			line = line.replace('<p>', '')
			line = line.replace('</p>', '')
			line = line.replace(/<a (.*?)>/, '')
			line = line.replace('</a>', '')

			if (!line.includes('<cc>')) {
				if (line.includes('<pi>')) {
					line = line.replace('<pi>', '')
					line = line.replace('</pi>', '')
					elementCodes.push(line)
				}
				script = script + line + '\n'
			}
		})

		return ({
			elementCodes: elementCodes,
			script: script
		})
	}
}
