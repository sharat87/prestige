import m from "mithril"
import type { RequestDetails } from "./Parser"

export interface CurlFormatOptions {
	useLongFlags: boolean
	singleLine: boolean
}

type Token = [token: string, style: string]

class ExportedRequest {
	tokens: Token[]

	constructor(tokens: Token[]) {
		this.tokens = tokens
	}

	toPlainString(): string {
		const parts: string[] = []
		for (const token of this.tokens) {
			parts.push(token[0])
		}
		return parts.join("")
	}

	toComponentChildren(): m.Children {
		const children: m.Children = []
		for (const token of this.tokens) {
			children.push(m("span", { class: token[1].replace(/\b(\w)/g, "cm-$1") }, token[0]))
		}
		return children
	}
}

export function exportToCurl(request: RequestDetails, options: Partial<CurlFormatOptions> = {}): ExportedRequest {
	const { singleLine, useLongFlags } = fillOptionsPartial(options)

	const newLineToken: Token = [singleLine ? " " : " \\\n\t", ""]
	const spaceToken: Token = [" ", ""]

	const tokens: Token[] = [["curl", "keyword"]]

	tokens.push(spaceToken, [useLongFlags ? "--request" : "-X", "variable"])
	tokens.push(spaceToken, [request.method, "string"])

	for (const [name, value] of request.headers) {
		tokens.push(newLineToken, [useLongFlags ? "--header" : "-H", "variable"])
		tokens.push(spaceToken, [`'${name.replace(/\b\w/g, (c) => c.toUpperCase())}: ${value}'`, "string"])
	}

	if (request.body !== "" && request.body != null) {
		tokens.push(newLineToken, ["--data", "variable"])
		tokens.push(spaceToken, ["'" + request.body.replace(/'/g, "'\"'\"'") + "'", "string"])
	}

	// TODO: For bash, if the body has newlines, it should be prefixed with a `$`. Not needed for zsh.
	tokens.push(newLineToken, ["'" + request.url.replace(/'/g, "'\"'\"'") + "'", "string"])

	return new ExportedRequest(tokens)
}

function fillOptionsPartial(options: Partial<CurlFormatOptions>): CurlFormatOptions {
	return {
		useLongFlags: false,
		singleLine: false,
		...options,
	}
}
