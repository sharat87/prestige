import type { RequestDetails } from "./Parser"

export interface CurlFormatOptions {
	useLongFlags: boolean
	singleLine: boolean
}

export function exportToCurl(request: RequestDetails, options: Partial<CurlFormatOptions> = {}): string {
	const { useLongFlags, singleLine } = fillOptionsPartial(options)

	const lines: string[] = ["curl"]

	lines[0] += " " + (useLongFlags ? "--request" : "-X") + " " + request.method

	for (const [name, value] of request.headers) {
		lines.push((useLongFlags ? "--header" : "-H") + ` '${name}: ${value}'`)
	}

	const url = request.url
	lines.push("'" + url.replace(/'/g, "'\"'\"'") + "'")

	return lines.join(singleLine ? " " : " \\\n\t")
}

function fillOptionsPartial(options: Partial<CurlFormatOptions>): CurlFormatOptions {
	return {
		useLongFlags: false,
		singleLine: false,
		...options,
	}
}
