import { Parser } from 'xml2js'

export class NsmlToJson {
	static convert (nsmlData: any) {
		let story = nsmlData.story
		story = story.replace('<nsml version="-//AVID//DTD NSML 1.0//EN">', 'dontReplaceHeader')

		story = story.replace(/=(.*?)>/g, '="$1">')
		story = story.replace(/<meta(.*?)>/g, '<meta$1\></meta>')
		story = story.replace(/<a (.*?)>/g, '<a $1\></a>')
		story = story.replace('dontReplaceHeader', '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\" \?>')

		const parser = new Parser()
		let converted: any
		parser.parseString(story, ((err: any, data: any) => {
			converted = data
			console.log('DUMMY LOG : ', err)
		})
		)
		return converted
	}
}
