import m, { VnodeDOM } from "mithril"
import Workspace from "./Workspace"
import CodeMirror from "codemirror"
import { LoadingLabel } from "./LoadingLabel"
import Toolbar from "./Toolbar"
import Table from "./Table"
import PageEnd from "./PageEnd"
import { NavLink } from "./NavLink"
import NothingMessage from "./NothingMessage"
import CodeBlock from "./CodeBlock"
import humanSizeDisplay from "./humanSizeDisplay"

interface Attrs {
	class?: string;
	workspace: Workspace;
}

interface State {
	requestMirror: CodeMirror.Editor;
	responseMirror: CodeMirror.Editor;
}

export default function ResultPane(): m.Component<Attrs, State> {
	return { view }

	function view(vnode: VnodeDOM<Attrs, State>) {
		const workspace = vnode.attrs.workspace
		const { result, isLoading } = workspace.session

		if (isLoading) {
			return m(".result-pane", { class: vnode.attrs.class }, [
				m(LoadingLabel),
				// TODO: Show Cancel button after a few seconds of request not completing.
				// M("p", m(LinkButton, "Cancel")),
			])
		}

		if (result == null) {
			return null
		}

		if (!result.ok) {
			const error = result.error ?? {}
			return m(".result-pane.error", { class: vnode.attrs.class }, [
				m(Toolbar),
				m(".body", [
					m("h2.pl2", "Error executing request"),
					error.title != null && m("h3", error.title),
					m(
						"pre.message.overflow-x-auto.overflow-y-hidden.ph2",
						error.message || "Unknown error occurred.",
					),
					error.stack && m("details", [
						m("summary.pointer", "Stack trace"),
						m("pre.ph2.ml2", error.stack),
					]),
					result.request && [
						m("h2.pl2", "Request details"),
						m(Table, { tableClass: "mono" }, [
							m("tr", [
								m("th.tl.v-top", "Method"),
								m("td", result.request.method || m("em", "Empty (which is okay, will just use GET).")),
							]),
							m("tr", [
								m("th.tl.v-top", "URL"),
								m("td", result.request.url || m("em", "Empty.")),
							]),
							m("tr", [
								m("th.tl.v-top", "Body"),
								m("td", m("pre.ma0", result.request.body) || m("em", "Empty.")),
							]),
							Object.entries(result.request).map(([name, value]) => {
								return name !== "method" && name !== "url" && name !== "body" && m("tr", [
									m("th.tl", name.replace(/\b\w/g, s => s.toUpperCase())),
									m("td", typeof value === "string"
										? value
										: JSON.stringify(value, null, 2)),
								])
							}),
						]),
					],
					m(PageEnd),
				]),
			])
		}

		const { response, proxy, history, cookieChanges } = result

		if (vnode.state.responseMirror) {
			vnode.state.responseMirror.setValue(response.body)
		}

		if (vnode.state.requestMirror) {
			vnode.state.requestMirror.setValue(response.request.body || "")
		}

		return m(".result-pane", { class: vnode.attrs.class }, [
			m(Toolbar, {
				left: m(".flex", [
					m(NavLink, { onclick: workspace.runAgain }, "Run Again"),
					m(NavLink, { onclick: () => {
						alert("Work in progress")
					} }, "Find in Editor"),
				]),
			}),
			m(".body", [
				m("ul.messages", [
					history.length > 0 && m("li",
						`Redirected ${ history.length === 1 ? "once" : history.length + "times" }.` +
						" Scroll down for more details."),
					result.timeTaken != null && m("li", [
						"Finished in ",
						m("b", m(IntervalDisplay, { ms: result.timeTaken })),
						".",
					]),
					cookieChanges && cookieChanges.any && m("li",
						[
							"Cookies: ",
							m.trust([
								cookieChanges.added ? (cookieChanges.added + " new") : null,
								cookieChanges.modified ? (cookieChanges.modified + " modified") : null,
								cookieChanges.removed ? (cookieChanges.removed + " removed") : null,
							].filter(v => v != null).join(", ")),
							".",
						],
					),
					m("li", proxy != null
						? ["Run with proxy at ", m("a", { href: proxy, target: "_blank" }, proxy), "."]
						: "Direct CORS request, no proxy used. Only limited information available."),
				]),
				renderResponse(response),
				history ? history.map(r => renderResponse(r)).reverse() : null,
				m(PageEnd),
			]),
		])
	}

	function renderResponse(response: any, proxy: null | string = null) {
		const responseContentType = getContentTypeFromHeaders(response && response.headers)
		const requestContentType = getContentTypeFromHeaders(response && response.request.headers)
		const nothingMessageAttrs = {
			extraMessage: proxy == null ? "This may be because a proxy was not used to run this request." : "",
		}

		const skin = ({
			2: "is-2xx",
			3: "is-3xx",
			4: "is-4xx",
			5: "is-5xx",
		} as Record<number, string>)[response.status.toString()[0]] ?? ""

		return response && m(".response", [
			m(
				".status.f2.pa2",
				{ class: skin },
				response.status + " " +
					response.statusText.toLowerCase().replace(/\b[a-z]/g, (x: string[]) => x[0].toUpperCase()),
			),
			m("pre.pa2.pb3.overflow-x-auto.overflow-y-hidden", response.request.method + " " + response.url),
			response.request.method === "GET"
				&& m("a.pl2", { href: response.url, target: "_blank" }, "Open GET request URL in new tab"),
			m("h2.pl2", "Response"),
			m(RichDataViewer, { text: response.body, spec: responseContentType }),
			m("h3.pl2", "Headers"),
			m(HeadersTable, { headers: response.headers }, m(NothingMessage, nothingMessageAttrs)),
			m("h2.pl2", "Request"),
			m(RichDataViewer, { text: response.request.body, spec: requestContentType }),
			m("h3.pl2", "Headers"),
			m(HeadersTable, { headers: response.request.headers }, m(NothingMessage, nothingMessageAttrs)),
		])
	}
}

function HeadersTable(): m.Component<{ headers: Headers | [name: string, value: string][] }> {
	let isSorted = false

	return { view }

	function view(vnode: m.VnodeDOM<{ headers: Headers | [name: string, value: string][] }>) {
		const { headers } = vnode.attrs

		if (headers == null) {
			return vnode.children
		}

		let headersArray: [name: string, value: string][] =
			headers instanceof Headers ? Array.from(headers.entries()) : headers

		if (isSorted) {
			headersArray = headersArray.concat().sort()
		}

		const rows: m.Vnode[] = []

		for (const [name, value] of headersArray) {
			rows.push(m("tr", [
				m("td", name.replace(/\b\w/g, s => s.toUpperCase())),
				m("td", value),
			]))
		}

		return rows.length > 0 ? [
			m("label.ph2", [
				m("input", {
					type: "checkbox",
					onchange(event: Event) {
						isSorted = (event.target as HTMLInputElement).checked
					},
				}),
				m("span.pl1", "Sorted"),
			]),
			m(Table, { tableClass: "mono" }, rows),
		] : null
	}
}

function RichDataViewer(): m.Component<{ text: string, spec: null | string }> {
	const enum Tabs {
		text,
		iFrame,
		image,
	}

	let visibleTab = Tabs.text

	return { oninit, view }

	function oninit(vnode: VnodeDOM<{ text: string, spec: null | string }>): void {
		const { spec } = vnode.attrs
		if (spec?.startsWith("image/")) {
			visibleTab = Tabs.image
		}
	}

	function toggleTab(title: string, tab: Tabs) {
		return m(NavLink, {
			class: "tab br2 br--top mh1",
			isActive: visibleTab === tab,
			onclick() {
				visibleTab = tab
			},
		}, title)
	}

	function view(vnode: VnodeDOM<{ text: string, spec: null | string }>) {
		let { text } = vnode.attrs
		const { spec } = vnode.attrs

		if (text == null) {
			text = ""
		}

		return text === "" ? m("p.i.pl2", "No body.") : [
			m("h3.pl2", [
				"Body",
				spec != null && m("small.pl1", `(${ spec })`),
				m("small.pl1", `(${ humanSizeDisplay(text.length) })`),
			]),
			// Tabs.
			m(".tab-bar", [
				spec?.startsWith("image/") ? toggleTab("Image", Tabs.image) : toggleTab("Text", Tabs.text),
				(spec === "text/html" || spec === "image/svg+xml") && toggleTab("iFrame", Tabs.iFrame),
				spec === "image/svg+xml" && toggleTab("Text", Tabs.text),
			]),
			// Panes.
			visibleTab === Tabs.text && m(CodeBlock, { text, spec: spec ?? "", class: "mt0" }),
			visibleTab === Tabs.iFrame && m("iframe.bn.pa0.w-100", {
				src: "data:text/html;base64," + btoa(text),
				sandbox: "",  // Disable scripts and whole lot of scary stuff in the iframe's document.
			}),
			visibleTab === Tabs.image && m(
				"img",
				{
					src: "data:" + spec + ";charset=utf-8;base64," +
						(spec?.endsWith("/svg+xml") ? btoa(text) : text),
				},
			),
		]
	}
}

const IntervalDisplay = {
	view(vnode: VnodeDOM<{ ms: number }>) {
		const { ms } = vnode.attrs

		if (ms < 1000) {
			return [ms, "ms"]

		} else {
			return [Math.round(ms / 100) / 10, "s"]

		}
	},
}

function getContentTypeFromHeaders(headers: Headers | Map<string, string> | string[][]) {
	if (headers == null) {
		return null
	}

	if (headers instanceof Headers) {
		headers = Array.from(headers.entries())
	}

	for (const [name, value] of headers) {
		if (name.toLowerCase() === "content-type") {
			return value.split(";", 1)[0]
		}
	}

	return null
}
