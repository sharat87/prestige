import m, { VnodeDOM } from "mithril";
import Workspace from "./Workspace";
import CodeMirror from "codemirror";
import { LoadingLabel } from "./LoadingLabel";
import { Toolbar } from "./Toolbar";
import { Table } from "./Table";
import PageEnd from "./PageEnd";
import { NavLink } from "./NavLink";
import NothingMessage from "./NothingMessage";
import CodeBlock from "./CodeBlock";

export default function ResultPane(): m.Component<{ class?: string, workspace: Workspace }> {
	return { view };

	function view(vnode: VnodeDOM<{ class?: string, workspace: Workspace }, { requestMirror: CodeMirror.Editor, responseMirror: CodeMirror.Editor }>) {
		const workspace = vnode.attrs.workspace;
		const { result, isLoading } = workspace.session;

		if (isLoading) {
			return m(".result-pane", { class: vnode.attrs.class }, [
				m(LoadingLabel),
				// TODO: Show Cancel button after a few seconds of request not completing.
				// M("p", m(LinkButton, "Cancel")),
			]);
		}

		if (result == null) {
			return null;
		}

		if (!result.ok) {
			return m(".result-pane.error", { class: vnode.attrs.class }, [
				m(Toolbar),
				m(".body", [
					m("h2.pl2", "Error executing request"),
					result.error.title != null && m("h3", result.error.title),
					result.error.message && m("pre.message.overflow-x-auto.overflow-y-hidden.ph2", result.error.message),
					result.error.stack && m("details", [
						m("summary.pointer", "Stack trace"),
						m("pre.ph2.ml2", result.error.stack),
					]),
					result.request && [
						m("h2.pl2", "Request details"),
						m(Table, [
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
									m("td", typeof value === "string" ? value : JSON.stringify(value, null, 2)),
								]);
							}),
						]),
					],
					m(PageEnd),
				]),
			]);
		}

		const { response, proxy, history, cookieChanges } = result;

		if (vnode.state.responseMirror) {
			vnode.state.responseMirror.setValue(response.body);
		}

		if (vnode.state.requestMirror) {
			vnode.state.requestMirror.setValue(response.request.body || "");
		}

		return m(".result-pane", { class: vnode.attrs.class }, [
			m(Toolbar, {
				left: m(".flex", [
					m(NavLink, { onclick: workspace.runAgain }, "Run Again"),
					m(NavLink, { onclick: () => { alert("Work in progress") } }, "Find in Editor"),
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
					cookieChanges.any && m("li",
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
		]);
	}

	function renderHeaders(headers: Headers | IterableIterator<[name: string, value: string]>) {
		if (headers == null) {
			return null;
		}

		if (headers instanceof Headers) {
			headers = headers.entries();
		}

		const rows: m.Vnode[] = [];

		for (const [name, value] of headers) {
			rows.push(m("tr.hover-bg-near-white", [
				m("td.v-top", name.replace(/\b\w/g, s => s.toUpperCase())),
				m("td", value),
			]));
		}

		return rows.length > 0 ? m(Table, rows) : null;
	}

	function renderResponse(response: any, proxy: null | string = null) {
		const responseContentType = getContentTypeFromHeaders(response && response.headers);
		const requestContentType = getContentTypeFromHeaders(response && response.request.headers);
		const nothingMessageAttrs = {
			extraMessage: proxy == null ? "This may be because a proxy was not used to run this request." : "",
		};

		const skin = ({
			2: ".bg-dark-green.washed-green",
			3: ".bg-dark-blue.washed-blue",
			4: ".bg-dark-red.washed-red",
			5: ".bg-dark-red.washed-red",
		} as Record<number, string>)[response.status.toString()[0]] || ".bg-dark-blue.washed-blue";

		return response && m(".response", [
			m(
				".f2.pa2" + skin,
				`${ response.status } ${ response.statusText }`,
			),
			m("pre.bg-near-white.pa2.pb3.overflow-x-auto.overflow-y-hidden", response.request.method + " " + response.url),
			m("a.pl2", { href: response.url, target: "_blank" }, "Open GET request URL in new tab"),
			m("h2.pl2", "Response"),
			m(RichDataViewer, { text: response.body, spec: responseContentType }),
			m("h3.pl2", "Headers"),
			renderHeaders(response.headers) || m(NothingMessage, nothingMessageAttrs),
			m("h2.pl2", "Request"),
			m(RichDataViewer, { text: response.request.body, spec: requestContentType }),
			m("h3.pl2", "Headers"),
			renderHeaders(response.request.headers) || m(NothingMessage, nothingMessageAttrs),
		]);
	}
}

function RichDataViewer(): m.Component<{ text: string, spec: null | string }> {
	const enum Tabs {
		text,
		iFrame,
		svgImage,
	}

	let visibleTab = Tabs.text;

	return { view };

	function toggleTab(title: string, tab: Tabs) {
		return m(NavLink, {
			class: "br2 br--top mh1",
			isActive: visibleTab === tab,
			onclick() {
				visibleTab = tab;
			},
		}, title)
	}

	function view(vnode: VnodeDOM<{ text: string, spec: null | string }>) {
		let { text } = vnode.attrs;
		const { spec } = vnode.attrs;

		if (text == null) {
			text = "";
		}

		return [
			text === "" ? m("p.i.pl2", "No body.") : [
				m("h3.pl2", [
					"Body ",
					spec != null && m("small", ` (${ spec })`),
				]),
				m(".flex.bb.b--dark-blue", [
					toggleTab("Text", Tabs.text),
					(spec === "text/html" || spec === "image/svg+xml") && toggleTab("iFrame", Tabs.iFrame),
					spec === "image/svg+xml" && toggleTab("Image", Tabs.svgImage),
				]),
			],
			m("div",
				{ style: { display: (text !== "" && visibleTab === Tabs.text) ? "" : "none" } },
				m(CodeBlock, {
					text,
					spec,
				}),
			),
			visibleTab === Tabs.iFrame && m("iframe.bn.pa0.w-100", {
				src: "data:text/html;base64," + btoa(text),
				sandbox: "",  // Disable scripts and whole lot of scary stuff in the frame's document.
			}),
			visibleTab === Tabs.svgImage && m("img", { src: "data:image/svg+xml;base64," + btoa(text) }),
		];
	}
}

const IntervalDisplay = {
	view(vnode: VnodeDOM<{ ms: number }>) {
		const { ms } = vnode.attrs;

		if (ms < 1000) {
			return [ms, "ms"];

		} else {
			return [Math.round(ms / 100) / 10, "s"];

		}
	},
};

function getContentTypeFromHeaders(headers: Headers | Map<string, string> | string[][]) {
	if (headers == null) {
		return null;
	}

	if (headers instanceof Headers) {
		headers = Array.from(headers.entries());
	}

	for (const [name, value] of headers) {
		if (name.toLowerCase() === "content-type") {
			return value.split(";", 1)[0];
		}
	}

	return null;
}
