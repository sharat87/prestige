import m from "mithril";
import { CodeBlock, Editor } from "./code-components";
import OptionsModal from "./Options";
import Workspace from "./Workspace";
import { NothingMessage } from "./NothingMessage";
import { LinkButton } from "./LinkButton";
import { ChevronDown, ExternalLink } from "./Icons";

window.addEventListener("load", () => {
	const root = document.createElement("div");
	root.setAttribute("id", "app");
	document.body.insertAdjacentElement("afterbegin", root);
	m.mount(root, MainView);
	document.getElementById("loadingBox")?.remove();
});

function MainView() {
	const workspace = new Workspace();
	workspace.loadInstance("master");

	document.addEventListener("keydown", event => {
		if (event.key === "Escape") {
			workspace.codeMirror?.focus();
		}
	});

	enum VisiblePopup {
		None,
		Options,
		Cookies,
	}

	let visiblePopup: VisiblePopup = VisiblePopup.None;

	return { view };

	function view() {
		return [
			m("main", [
				m("header", [
					m("div", [
						m("h1", "Prestige"),
						m("span", { style: { marginLeft: "1em" } }, m("em", "Just an HTTP client by Shrikant.")),
					]),
					m("div", [
						m(
							LinkButton,
							["Doc: master", m(ChevronDown)]
						),
						m(
							LinkButton,
							{ onclick: onCookiesToggle, isActive: visiblePopup === VisiblePopup.Cookies },
							[`Cookies (${ workspace.cookieJar.size }) `, m(ChevronDown)]
						),
						m(
							LinkButton,
							{ onclick: onOptionsToggle, isActive: visiblePopup === VisiblePopup.Options },
							["Options", m(ChevronDown)]
						),
						m(LinkButton, { href: "help.html" }, ["Help", m(ExternalLink)]),
						m(LinkButton, { href: "https://github.com/sharat87/prestige" }, ["GitHub", m(ExternalLink)]),
					]),
				]),
				m(WorkspaceView, { workspace }),
				visiblePopup === VisiblePopup.Options && m(OptionsModal, {
					doSave: onOptionsSave,
					doClose: onOptionsToggle,
				}),
				visiblePopup === VisiblePopup.Cookies && m(CookiesModal, {
					cookies: workspace.cookieJar,
					onClose: onCookiesToggle,
					onClear: onClearCookies,
				}),
			]),
		];
	}

	function onCookiesToggle() {
		visiblePopup = visiblePopup === VisiblePopup.Cookies ? VisiblePopup.None : VisiblePopup.Cookies;
		m.redraw();
	}

	function onClearCookies() {
		workspace.cookieJar.clear();
	}

	function onOptionsToggle() {
		visiblePopup = visiblePopup === VisiblePopup.Options ? VisiblePopup.None : VisiblePopup.Options;
		m.redraw();
	}

	function onOptionsSave() {
		alert("WIP Save & apply options");
		m.redraw();
	}
}

function WorkspaceView() {
	return { view };

	function view(vnode) {
		const workspace = vnode.attrs.workspace;
		return m(".er-pair", [
			m(".editor-pane", m(Editor, { workspace })),
			m(ResultPane, { workspace }),
		]);
	}
}

const Toolbar = {
	view: vnode => m(".toolbar", (vnode.attrs.left || vnode.attrs.right) && [
		m(".bar", [
			m("div.left", vnode.attrs.left),
			m("div.right", vnode.attrs.right),
		]),
		// TODO: Can we use `vnode.children` instead of `vnode.attrs.peripherals`?
		m(".peripherals", vnode.attrs.peripherals),
	])
};

function ResultPane() {
	return { view };

	function view(vnode) {
		const workspace = vnode.attrs.workspace;
		const { result, isLoading } = workspace.session;

		if (isLoading) {
			return m(".result-pane.loading", [
				m("p", m.trust("Loading&hellip;")),
				// TODO: Show Cancel button after a few seconds of request not completing.
				// m("p", m(LinkButton, "Cancel")),
			]);
		}

		if (result == null) {
			return null;
		}

		if (!result.ok) {
			return m(".result-pane.error", [
				m(Toolbar),
				m(".body", [
					m("h2", "Error executing request"),
					result.error.title != null && m("h3", result.error.title),
					m("pre.message", result.error.message),
					result.error.stack && m("pre", result.error.stack),
					result.request && [
						m("h2", "Request details"),
						m(Table, [
							m("tr", [
								m("th", "Method"),
								m("td", result.request.method || m("em", "Empty (which is okay, will just use GET).")),
							]),
							m("tr", [
								m("th", "URL"),
								m("td", result.request.url || m("em", "Empty.")),
							]),
							m("tr", [
								m("th", "Body"),
								m("td", m("pre", result.request.body) || m("em", "Empty.")),
							]),
							Object.entries(result.request).map(([name, value]) => {
								return name !== "method" && name !== "url" && name !== "body" && m("tr", [
									m("th", name.replace(/\b\w/g, stringUpperCase)),
									m("td", typeof value === "string" ? value : JSON.stringify(value, null, 2)),
								])
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

		return m(".result-pane", [
			m(Toolbar, {
				left: m(LinkButton, { onclick: workspace.runAgain }, "Run Again"),
			}),
			m(".body", [
				m("ul.messages", [
					history.length > 0 && m("li",
						`Redirected ${ history.length === 1 ? "once" : history.length + "times" }.` +
						" Scroll down for more details."),
					m("li", [
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
						]
					),
					m("li", proxy != null
						? ["Run with proxy at ", m("a", { href: proxy, target: "_blank" }, proxy), "."]
						: "Direct CORS request, no proxy used. Only limited information available."),
				]),
				renderResponse(response),
				history ? history.map(renderResponse).reverse() : null,
				m(PageEnd),
			]),
		]);
	}

	function renderHeaders(headers) {
		if (headers == null) {
			return null;
		}

		if (headers instanceof Headers) {
			headers = headers.entries();
		}

		const rows: m.Vnode[] = [];

		for (const [name, value] of headers) {
			rows.push(m("tr", [
				m("td", name.replace(/\b\w/g, stringUpperCase)),
				m("td", value),
			]));
		}

		return rows.length > 0 ? m(Table, rows) : null;
	}

	function renderResponse(response, proxy: null | string = null) {
		const responseContentType = getContentTypeFromHeaders(response && response.headers);
		const requestContentType = getContentTypeFromHeaders(response && response.request.headers);
		const nothingMessageAttrs = {
			extraMessage: proxy == null ? "This may be because a proxy was not used to run this request." : "",
		};

		return response && m("div.response", [
			m(
				"h2",
				{ class: "status s" + response.status.toString()[0] + "xx" },
				`${ response.status } ${ response.statusText }`
			),
			m("pre.url", response.request.method + " " + response.url),
			m("h2", "Response"),
			m(RichDataViewer, { text: response.body, spec: responseContentType }),
			m("h3", "Headers"),
			renderHeaders(response.headers) || m(NothingMessage, nothingMessageAttrs),
			m("h2", "Request"),
			m(RichDataViewer, { text: response.request.body, spec: requestContentType }),
			m("h3", "Headers"),
			renderHeaders(response.request.headers) || m(NothingMessage, nothingMessageAttrs),
		]);
	}
}

function RichDataViewer() {
	enum Tabs {
		text,
		svgSafe,
		svgRaw,
	}

	let visibleTab = Tabs.text;

	return { view };

	function view(vnode) {
		let { text } = vnode.attrs;
		const { spec } = vnode.attrs;

		if (text == null) {
			text = "";
		}

		return [
			m("h3", [
				"Body ",
				spec != null && m("small", ` (${ spec })`),
			]),
			text !== "" && m(".tab-bar", [
				m(LinkButton, {
					isActive: visibleTab === Tabs.text, onclick() {
						visibleTab = Tabs.text
					}
				}, "Text"),
				spec === "image/svg+xml" && [
					m(LinkButton, {
						isActive: visibleTab === Tabs.svgSafe, onclick() {
							visibleTab = Tabs.svgSafe
						}
					}, "SVG Safe"),
					m(LinkButton, {
						isActive: visibleTab === Tabs.svgRaw, onclick() {
							visibleTab = Tabs.svgRaw
						}
					}, "SVG Raw"),
				],
			]),
			m("div",
				{ style: { padding: 0, display: (text !== "" && visibleTab === Tabs.text) ? "" : "none" } },
				m(CodeBlock, {
					text,
					spec,
				})
			),
			visibleTab === Tabs.svgSafe && m("img", { src: "data:image/svg+xml;base64," + btoa(text) }),
			visibleTab === Tabs.svgRaw && m.trust(text),
		];
	}
}

const IntervalDisplay = {
	view(vnode) {
		const { ms } = vnode.attrs;

		if (ms < 1000) {
			return [ms, "ms"];

		} else {
			return [Math.round(ms / 100) / 10, "s"];

		}
	}
};

const PageEnd = {
	view: () => m(
		"p",
		{ style: { margin: "2em 0 3em", textAlign: "center", fontSize: "2em" } },
		"❦"
	)
};

const CookiesModal = {
	view: vnode => m(".modal", [
		m("header", m("h2", "Cookies")),
		m("section", [
			m("pre", "this.cookies = " + JSON.stringify(vnode.attrs.cookies, null, 2)),
			m("p.note", { style: { marginTop: "2em" } }, "These cookies will be used for requests executed by proxy" +
				" only. For requests that are executed without a proxy, please refer to the browser console. This is" +
				" a browser-level security restriction."),
			m(PageEnd),
		]),
		m("footer", [
			m("div", [
				vnode.attrs.cookies?.size > 0 && m(
					"button",
					{ type: "button", onclick: vnode.attrs.onClear },
					"Clear all cookies"
				),
			]),
			m("div", [
				// m("button.primary", { type: "button", onclick: vnode.attrs.doSave }, "Save"),
				m("button", { type: "button", onclick: vnode.attrs.onClose }, "Close"),
			]),
		]),
	])
};

const Table = {
	view: vnode => vnode.children && vnode.children.length > 0 &&
		m(".table-box", m("table", m("tbody", vnode.children)))
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

function stringUpperCase(s) {
	return s.toUpperCase();
}
