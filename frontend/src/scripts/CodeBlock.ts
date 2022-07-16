import m from "mithril"
import CodeMirror from "_/codemirror"
import NothingMessage from "_/NothingMessage"
import { repeat } from "_/utils"
import padStart from "lodash/padStart"

interface Attrs {
	text?: string
	spec?: string
	elements?: m.Children
	class?: string
}

/**
 * This is just a glorified `pre` element. This is component optimized and only-used for read-only code snippet display.
 */
export default { view }

const tabSize = 4

// Number of bytes, if response body is larger than this, syntax highlighting is turned off.
const tooLargeThreshold = 400 * 1000

function view(vnode: m.VnodeDOM<Attrs>): m.Children {
	const { elements } = vnode.attrs
	let { spec } = vnode.attrs

	if (spec == null) {
		spec = "text"
	}

	// Code taken from the official runMode addon of CodeMirror.
	const fullText: string = asString(vnode.attrs.text, spec)

	if (fullText === "" && elements == null) {
		return m(NothingMessage)
	}

	const isTooLarge = fullText.length > tooLargeThreshold

	return [
		!isTooLarge && m(
			"pre.overflow-x-auto.cm-s-default",
			{
				class: vnode.attrs.class,
			},
			elements != null ? elements : renderTokens(fullText, CodeMirror.getMode(CodeMirror.defaults, spec)),
		),
		isTooLarge && [
			m("p", "Response content too large. Syntax highlighting turned off."),
			m(
				"pre.overflow-x-auto.flex",
				{
					class: vnode.attrs.class,
				},
				fullText,
			),
		],
	]
}

function renderTokens(fullText: string, mode: CodeMirror.Mode<unknown>): m.Children {
	const lineNumEls: m.Vnode[] = []
	const rows: m.Children = []

	lineNumEls.push(m("span.line-nums", 1))
	rows.push(lineNumEls[0])

	interface NestingInfo {
		commentEl: m.Vnode
		count: number
		openIndex: number
		summaryEndIndex: number
		isClosed: boolean
	}

	const nestingStack: NestingInfo[] = []

	let col = 0
	let prevTokenText: null | string = null
	let prevNewLineIndex = 0

	runMode(fullText, mode, (text: string, style: null | string) => {
		if (text === "\n") {
			const tokenSpan = m("span", text)

			if (nestingStack.length > 0 && nestingStack[nestingStack.length - 1].isClosed) {
				const stackItem = nestingStack.pop()
				if (stackItem != null) {
					rows.splice(
						stackItem.openIndex,
						rows.length - stackItem.openIndex,
						m(
							"details.fold",
							{
								open: true,
								onclick(event: Event) {
									if (!(event.target as Element).matches(".line-nums")) {
										event.preventDefault()
									}
								},
							},
							[
								m("summary", rows.slice(stackItem.openIndex, stackItem.summaryEndIndex)),
								rows.slice(stackItem.summaryEndIndex + 1),
							],
						),
					)
				}
			}

			if (prevTokenText === "{" || prevTokenText === "[") {
				const commentEl = m("span.i.cm-comment.no-select", "")
				rows.push(commentEl)
				nestingStack.push({
					commentEl,
					count: 1,
					openIndex: prevNewLineIndex + 1,
					summaryEndIndex: rows.length,
					isClosed: false,
				})
			}
			prevNewLineIndex = rows.push(tokenSpan) - 1
			col = 0

			const lineNumEl = m("span.line-nums", lineNumEls.length + 1)
			lineNumEls.push(lineNumEl)
			rows.push(lineNumEl)

		} else {
			let content = ""

			// Replace tabs
			for (let pos = 0;;) {
				const idx = text.indexOf("\t", pos)
				if (idx === -1) {
					content += text.slice(pos)
					col += text.length - pos
					break
				} else {
					col += idx - pos
					content += text.slice(pos, idx)
					const size = tabSize - col % tabSize
					col += size
					content += repeat(" ", size).join("")
					pos = idx + 1
				}
			}

			const tokenSpan = style == null ?
				m("span", content) :
				m("span", { class: "cm-" + style.replace(/ +/g, " cm-") }, content)

			rows.push(tokenSpan)

			if (nestingStack.length > 0) {
				if ((text === "}" && prevTokenText !== "{") || (text === "]" && prevTokenText !== "[")) {
					const stackItem = nestingStack[nestingStack.length - 1]
					if (stackItem != null) {
						stackItem.isClosed = true
						stackItem.commentEl.text = stackItem.count > 2 ? `${stackItem.count} items` : ""
					}
				} else if (text === ",") {
					++nestingStack[nestingStack.length - 1].count
				}
			}

		}

		prevTokenText = text

	})

	let i = 1
	const gutterWidth = lineNumEls.length.toString().length
	for (const lineNumEl of lineNumEls) {
		lineNumEl.text = padStart(i.toString(), gutterWidth, " ")
		++i
	}

	return rows

}

function asString(text: unknown, spec?: string): string {
	if (text == null) {
		return ""
	} else if (typeof text !== "string") {
		return JSON.stringify(text, null, 2)
	} else {
		return spec == null ? text : prettify(text, spec)
	}
}

function prettify(text: string, spec?: string) {
	const language = spec == null ? null : spec.split("/", 2)[1]

	if (language === "json") {
		return prettifyJson(text)
	}

	return text
}

function prettifyJson(json: string) {
	try {
		return JSON.stringify(JSON.parse(json), null, 2)
	} catch (error) {
		// TODO: The fact that this JSON is invalid should be communicated to the user.
		console.error("Error parsing/prettifying JSON.", json)
		return json
	}
}

// Code taken from the official runMode addon of CodeMirror.
function runMode(
	inputText: string,
	mode: CodeMirror.Mode<unknown>,
	callback: ((text: string, style: string | null) => void),
): void {
	const lines = CodeMirror.splitLines(inputText)
	const state = CodeMirror.startState(mode)
	for (let i = 0, e = lines.length; i < e; ++i) {
		if (i) {
			callback("\n", null)
		}
		const stream = new (CodeMirror as any).StringStream(lines[i], null, {
			lookAhead(n: number) {
				return lines[i + n]
			},
			baseToken() {
				return null
			},
		})
		if (!stream.inputText && mode.blankLine) {
			mode.blankLine(state)
		}
		while (!stream.eol()) {
			const style = mode.token(stream, state)
			callback(stream.current(), style /*, i, stream.start, state */)
			stream.start = stream.pos
		}
	}
}
