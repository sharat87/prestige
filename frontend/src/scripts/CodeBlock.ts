import m from "mithril"
import CodeMirror from "./codemirror"
import NothingMessage from "./NothingMessage"

interface Attrs {
	text: string
	spec?: string
}

export default function CodeBlock(): m.Component<Attrs> {
	const tabSize = 4

	return { view }

	function view(vnode: m.VnodeDOM<Attrs>) {
		const rows: m.Children = []
		let col = 0
		const mode = CodeMirror.getMode(CodeMirror.defaults, vnode.attrs.spec)

		// Code taken from the official runMode addon of CodeMirror.
		const fullText = asString(vnode.attrs.text, vnode.attrs.spec)

		if (fullText === "") {
			return m(NothingMessage)
		}

		const isTruncated = fullText.length > 500 * 1000
		const truncatedText = isTruncated ? fullText.substr(0, 500 * 1000) : fullText

		runMode(truncatedText, mode, (text: string, style: string | null) => {
			if (text === "\n") {
				rows.push(m("span", text))
				col = 0
				return
			}
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
					for (let i = 0; i < size; ++i) {
						content += " "
					}
					pos = idx + 1
				}
			}
			// Create a node with token style and append it to the callback DOM element.
			if (style != null) {
				rows.push(m("span", { class: "cm-" + style.replace(/ +/g, " cm-") }, content))
			} else {
				rows.push(m("span", content))
			}
		})

		return [
			isTruncated && m("p", [
				"Content too large to show here. You may ",
				m("a", {
					href: "#",
					onclick(event: MouseEvent) {
						event.preventDefault()
						// TODO: This window closes immediately after opening. Looks like an ad-blocker issue.
						// Inform users about this, if they are using an ad-blocker.
						window.open("data:text/plain;base64," + btoa(fullText), "_blank")
					},
				},
				"view full response in a new tab"),
				".",
			]),
			m("pre.overflow-x-auto.pa2.mt0.cm-s-default", rows),
		]
	}
}

function asString(text: any, spec?: string): string {
	if (text != null && typeof text !== "string") {
		text = JSON.stringify(text)
	}

	if (text == null) {
		return ""
	}

	if (spec == null) {
		return text
	}

	return prettify(text, spec)
}

function prettify(text: string, spec: null | string) {
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
		console.error("Error parsing/prettifying JSON.")
		return json
	}
}

// Code taken from the official runMode addon of CodeMirror.
function runMode(inputText: string, mode: any, callback: ((text: string, style: string | null) => void)): void {
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
