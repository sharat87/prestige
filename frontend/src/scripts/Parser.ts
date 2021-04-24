import { buildQueryString } from "mithril"
import interpolate from "./interpolate"
import { Context } from "./Context"
import { MultiPartForm } from "./BodyTypes"

export interface RequestDetails {
	method: string
	url: string
	headers: Headers
	bodyType: string
	body: string
}

const AsyncFunction = Object.getPrototypeOf(async () => 0).constructor

export async function extractRequest(lines: string[], runLineNum: number, context: Context): Promise<RequestDetails> {

	const structure: Block[] = parse(lines)
	console.log("structure", structure)

	const scriptBlocks: JavascriptBlock[] = []
	let requestBlock: null | HttpRequestBlock = null

	for (const block of structure) {
		if (block.start > runLineNum) {
			// This block is completely below the runLineNum.
			break
		}

		if (block.type === BlockType.JAVASCRIPT) {
			if (block.end >= runLineNum) {
				throw new Error("Can't execute from inside a script block.")
			} else {
				scriptBlocks.push(block)
			}

		} else if (block.type === BlockType.HTTP_REQUEST && block.end >= runLineNum) {
			requestBlock = block
			break

		}
	}

	if (requestBlock == null) {
		throw new Error("Couldn't identify the request to be run.")
	}

	for (const block of scriptBlocks) {
		const code = lines.slice(block.start, block.end + 1).join("\n")
		await (new AsyncFunction(code).call(context))
	}

	const details = {
		method: "GET",
		url: "",
		bodyType: "raw",
		body: "",
		headers: new Headers(),
	}

	const renderedLines = interpolate(
		lines.slice(requestBlock.header.start, requestBlock.header.end + 1).join("\n"),
		context,
	).split("\n")
	const [method, ...urlParts] = renderedLines[0].split(/\s+/)
	details.method = method.toUpperCase()
	details.url = urlParts.join(" ")

	const queryParams: string[] = []
	let isHeadersStarted = false
	for (const rLine of renderedLines.slice(1)) {
		if (!isHeadersStarted && !rLine.match(/^\s/)) {
			isHeadersStarted = true
		}

		if (isHeadersStarted) {
			const [name, ...valueParts] = rLine.split(/:\s*/)
			if (name === "") {
				throw new Error("Header name cannot be blank.")
			}
			details.headers.append(name, valueParts.join(":"))
		} else {
			queryParams.push(rLine.replace(/^\s+/, ""))
		}
	}

	if (queryParams.length > 0) {
		const paramsObject: Record<string, string> = {}
		for (const param of queryParams) {
			const parts = param.split("=")
			paramsObject[parts[0]] = parts.length > 1 ? parts.slice(1).join("=") : ""
		}
		details.url += (details.url.includes("?") ? "&" : "?") + buildQueryString(paramsObject)
	}

	if (requestBlock.payload != null) {
		const bodyLines = lines.slice(requestBlock.payload.start, requestBlock.payload.end + 1)

		if (bodyLines[0].startsWith("=")) {
			// Replace that `=` with `return` and we assume what followed that `=` is a single JS expression.
			const code = "return " + bodyLines.join("\n").substr(1)
			const body = await (new AsyncFunction(code).call(context))
			if (typeof body === "string") {
				details.body = body
			} else if (body == null) {
				details.body = ""
			} else if (body instanceof MultiPartForm) {
				details.bodyType = "multipart/form-data"
				details.headers.set("Content-Type", "multipart/form-data")
				const rawData: Record<string, unknown> = {}
				for (const [key, value] of body) {
					rawData[key] = value
				}
				details.body = JSON.stringify(rawData)
			} else {
				details.headers.set("Content-Type", "application/json")
				details.body = JSON.stringify(body)
			}

		} else {
			details.body = bodyLines.join("\n")

		}

		details.body = details.body.trim()
	}

	return details
}

export const enum BlockType {
	PAGE_BREAK,
	HTTP_REQUEST,
	JAVASCRIPT,
}

interface BlockBase {
	// TODO: The start and end are both inclusive currently, and mark the start and end of *content*, not blank lines
	//   If any. Change this to have `end` be exclusive, and both figures include whitespace around the block content.
	type: BlockType;
	start: number;
	end: number;
}

export interface PageBreakBlock extends BlockBase {
	type: BlockType.PAGE_BREAK;
	tail: string;
}

export interface HttpRequestBlock extends BlockBase {
	type: BlockType.HTTP_REQUEST;
	header: {
		start: number;
		end: number;
	};
	payload: null | {
		start: number;
		end: number;
	};
}

export interface JavascriptBlock extends BlockBase {
	type: BlockType.JAVASCRIPT;
}

export type Block = PageBreakBlock | HttpRequestBlock | JavascriptBlock

export function parse(input: string[] | string): Block[] {
	const lines: string[] = typeof input === "string" ? input.split("\n") : input

	const blocks: Block[] = []

	let state = "begin"
	let lastNonBlank = -1
	let currentBlock: null | Block = null

	for (const [index, line] of lines.entries()) {
		const hasText = line.trim() !== ""
		let isComment = false

		if (line.startsWith("###")) {
			if (currentBlock) {
				currentBlock.end = index - 1
				if (currentBlock.type === BlockType.HTTP_REQUEST) {
					if (currentBlock.payload == null) {
						currentBlock.header.end = lastNonBlank
					} else {
						currentBlock.payload.end = lastNonBlank
					}
				}
			}

			const tail = line.replace(/^#+\s*/, "")
			blocks.push({ start: index, end: index, type: BlockType.PAGE_BREAK, tail })
			if (tail === "javascript") {
				state = "javascript-before-content"
				currentBlock = {
					type: BlockType.JAVASCRIPT,
					start: -1,
					end: -1,
				}
			} else {
				state = "http-before-headers"
				currentBlock = {
					type: BlockType.HTTP_REQUEST,
					start: -1,
					end: -1,
					header: {
						start: -1,
						end: -1,
					},
					payload: null,
				}
			}
			blocks.push(currentBlock)

		} else if (line.startsWith("#")) {
			// This is a comment line. Just ignore.
			isComment = true

		} else if (!hasText) {
			if (state === "http-headers") {
				state = "http-before-payload"
				if (currentBlock && currentBlock.type === BlockType.HTTP_REQUEST) {
					currentBlock.header.end = lastNonBlank
				}
			}

		} else if (hasText) {
			if (state === "begin") {
				state = "http-headers"
				currentBlock = {
					type: BlockType.HTTP_REQUEST,
					start: lastNonBlank + 1,
					end: index,
					header: {
						start: index,
						end: index,
					},
					payload: null,
				}
				blocks.push(currentBlock)
			} else if (state === "http-before-headers") {
				state = "http-headers"
				if (currentBlock && currentBlock.type === BlockType.HTTP_REQUEST) {
					currentBlock.start = lastNonBlank + 1
					currentBlock.header.start = index
				}
			} else if (state === "http-before-payload") {
				state = "http-payload"
				if (currentBlock && currentBlock.type === BlockType.HTTP_REQUEST) {
					currentBlock.payload = {
						start: index,
						end: index,
					}
				}
			} else if (state === "javascript-before-content") {
				state = "javascript-content"
				if (currentBlock && currentBlock.type === BlockType.JAVASCRIPT) {
					currentBlock.start = index
				}
			}

		}

		if (hasText && !isComment) {
			lastNonBlank = index
		}
	}

	if (currentBlock) {
		currentBlock.end = lines.length - 1
		if (currentBlock.type === BlockType.HTTP_REQUEST) {
			if (currentBlock.payload == null) {
				currentBlock.header.end = lastNonBlank
			} else {
				currentBlock.payload.end = lastNonBlank
			}
		}
	}

	return blocks
}
