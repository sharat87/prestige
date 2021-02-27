import m from "mithril"
import type { VnodeDOM } from "mithril"
import CodeMirror from "./codemirror"
import NothingMessage from "./NothingMessage"

export default function CodeBlock(): m.Component<{ spec: string, text: string }> {
	let codeMirror: null | CodeMirror.Editor = null
	let prevText: null | string = null
	let prevSpec: null | string = null
	return { view, oncreate }

	function oncreate(vnode: VnodeDOM<{ spec: string, text: string }>) {
		console.log("Created new CodeBlock", vnode.attrs)
		if (vnode.dom.classList.contains("code-block")) {
			if (!(vnode.dom instanceof HTMLElement)) {
				throw new Error("CodeMirror for CodeBlock cannot be initialized unless `vnode.dom` is an HTMLElement.")
			}

			const { text, spec } = vnode.attrs
			codeMirror = CodeMirror(vnode.dom, {
				mode: vnode.attrs.spec,
				readOnly: true,
				lineNumbers: true,
				foldGutter: true,
				gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
				value: asString(text, spec),
			})
			prevText = text
			prevSpec = spec
		}
	}

	function view(vnode: VnodeDOM<{ spec: string, text: string }>) {
		const haveText = asString(vnode.attrs.text, vnode.attrs.spec) !== ""
		const { text, spec } = vnode.attrs
		if (codeMirror != null && (spec !== prevSpec || text !== prevText)) {
			codeMirror.setValue(asString(text, spec))
			prevText = text
			prevSpec = spec
		}

		return haveText
			? m(".code-block.pa0", { style: { display: haveText ? "" : "none" } })
			: m(NothingMessage)
	}

	function asString(text: any, spec: string): string {
		if (text != null && typeof text !== "string") {
			text = JSON.stringify(text)
		}

		return text == null ? "" : prettify(text, spec)
	}
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
