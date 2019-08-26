import { Parser } from 'xml2js'

export class NsmlToJson {
	static convert (nsmlData: any) {

		// Split tags into objects:
		let storyArray = nsmlData.story.split('\n')

		// Put end tag on <meta>
		storyArray[2] = storyArray[2].replace(/<meta(.*?)>/g, '<meta$1\></meta>')

		console.log('DUMMY LOG : ', storyArray)

		storyArray = storyArray.map((story: string) => {
			// Set quotes around arguments xx="yy" instead of xx=yy
			// But not on <ap> tags:
			if (story.slice(0, 3) !== '<ap') {
				// and not when there´s allready qoute around argument:
				if (!story.match(/="/)) {
					story = story.replace(/(<.*?)=(.*?)>/g, '$1="$2">')
				}
			}
			// Put end tag on <a> tags:
			story = story.replace(/<a (.*?)>/g, '<a $1></a>')
			// Remove double tab in some forms:
			story = story.replace(/<tab>/g, '')

			return story
		})
		// Change header to XML:
		storyArray[0] = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>'
		// Put tag around the full form (head-body etc.):
		storyArray.splice(1, 0, '<root>')
		storyArray.push('</root>')

		// Convert back to string:
		let story = storyArray.join('\n')

		const parser = new Parser({
			mergeAttrs: true
		})
		let converted: any
		parser.parseString(story, ((err: any, data: any) => {
			converted = data
			if (err) {
				console.log('DUMMY LOG : ', err)
			}
		})
		)
		return converted
	}
}
