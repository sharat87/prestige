import m from "mithril";
import HttpSession from "./HttpSession";
import { Editor, CodeBlock } from "./code-components";
import OptionsModal from "./Options";
import { loadInstance, saveInstance } from "./storage";
import Beacon from "./Beacon";

// Expected environment variables.
declare var process: { env: { PRESTIGE_PROXY_URL: string } };

window.addEventListener("load", () => {
	const root = document.createElement("div");
	root.setAttribute("id", "app");
	document.body.insertAdjacentElement("afterbegin", root);
	m.mount(root, MainView);
	document.getElementById("loadingBox")?.remove();
});

function MainView() {
	const client = new HttpSession(process.env.PRESTIGE_PROXY_URL);

	const workspaceBeacon = new Beacon();

	const instance = loadInstance("master") || { text: "GET http://httpbin.org/get?name=haha\n\n###\n\nPOST http://httpbin.org/post\nContent-Type: application/x-www-form-urlencoded\n\nusername=sherlock&password=elementary\n", cookieJar: {}};
	if (instance.cookieJar) {
		client.cookieJar.update(instance.cookieJar);
		m.redraw();
	}

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
						m("span", { style: { "margin-left": "1em" } }, m("em", "Just an HTTP client by Shrikant.")),
					]),
					m("div", [
						m(
							LinkButton,
							"Doc: master ▼"
						),
						m(
							LinkButton,
							{ onclick: onCookiesToggle, isActive: visiblePopup === VisiblePopup.Cookies },
							`Cookies (${client.cookieJar.size}) ▼`
						),
						m(
							LinkButton,
							{ onclick: onOptionsToggle, isActive: visiblePopup === VisiblePopup.Options },
							"Options ▼"
						),
						m(LinkButton, { href: "help.html" }, "Help"),
						m(LinkButton, { href: "https://github.com/sharat87/prestige" }, "GitHub"),
					]),
				]),
				m(".er-pair", [
					m(EditorPane, {
						onExecute,
						content: instance?.text,
						onChanges: doSave,
						workspaceBeacon,
					}),
					m(ResultPane, { client, workspaceBeacon }),
				]),
				visiblePopup === VisiblePopup.Options && m(OptionsModal, { doSave: onOptionsSave, doClose: onOptionsToggle }),
				visiblePopup === VisiblePopup.Cookies && m(CookiesModal, { cookies: client.cookieJar, onClose: onCookiesToggle, onClear: onClearCookies }),
			]),
		];
	}

	function onCookiesToggle(event) {
		if (event) {
			event.preventDefault();
		}
		visiblePopup = visiblePopup === VisiblePopup.Cookies ? VisiblePopup.None : VisiblePopup.Cookies;
		m.redraw();
	}

	function onClearCookies() {
		client.cookieJar.clear();
	}

	function onOptionsToggle() {
		visiblePopup = visiblePopup === VisiblePopup.Options ? VisiblePopup.None : VisiblePopup.Options;
		m.redraw();
	}

	function onOptionsSave() {
		console.warn("WIP Save & apply options");
		m.redraw();
	}

	function onExecute(lines, cursorLine) {
		client.runTop(lines, cursorLine)
			.finally(() => {
				instance.cookieJar = client.cookieJar;
				doSave();
				m.redraw();
			});
	}

	function doSave(content?: string) {
		if (content) {
			instance.text = content;
		}
		saveInstance("master", instance);
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
}

function EditorPane(initialVnode) {
	// TODO: Merge this with the Editor component.
	let { onExecute } = initialVnode.attrs;
	let isCookiesPopupVisible = false;
	const flashQueue: any[] = [];
	let prevExecuteBookmark: null | CodeMirror.TextMarker = null;

	return { view };

	function view(vnode) {
		onExecute = vnode.attrs.onExecute;
		return m(".editor-pane", m(Editor, {
			flashQueue,
			content: vnode.attrs.content,
			onUpdate: vnode.attrs.onChanges,
			onExecute: onExecuteCb,
			workspaceBeacon: vnode.attrs.workspaceBeacon,
			onRunAgain,
		}));
	}

	function onExecuteCb(codeMirror) {
		if (codeMirror.somethingSelected()) {
			alert("Running a selection is not supported yet.");
		}

		const lines = codeMirror.getValue().split("\n");
		const cursorLine = codeMirror.getCursor().line;

		prevExecuteBookmark?.clear();
		prevExecuteBookmark = codeMirror.getDoc().setBookmark(codeMirror.getCursor());

		let startLine = cursorLine;
		while (startLine >= 0 && !lines[startLine].startsWith("###")) {
			--startLine;
		}

		let endLine = cursorLine;
		while (endLine <= lines.length && !lines[endLine].startsWith("###")) {
			++endLine;
		}

		// TODO: Compute the page borders to apply flash correctly.
		flashQueue.push({ start: startLine, end: endLine + 1 });

		onExecute(lines, cursorLine);
	}

	function onRunAgain(codeMirror: CodeMirror.Editor) {
		if (prevExecuteBookmark == null) {
			return;
		}
		codeMirror.setCursor(prevExecuteBookmark.find() as any);
		onExecuteCb(codeMirror);
	}

	function toggleCookiesPopup() {
		isCookiesPopupVisible = !isCookiesPopupVisible;
		m.redraw();
	}
}

function ResultPane() {
	return { view };

	function view(vnode) {
		const { result, isLoading } = vnode.attrs.client;

		if (isLoading) {
			return m(".result-pane.loading", m("p", m.trust("Loading&hellip;")));
		}

		if (result == null) {
			return null;
		}

		if (!result.ok) {
			return m(".result-pane.error", [
				m(Toolbar),
				m(".body", [
					m("h2", "Error executing request"),
					m("p.message", result.error.message),
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

		const { response, history, cookieChanges } = result;

		if (vnode.state.responseMirror) {
			vnode.state.responseMirror.setValue(response.body);
		}

		if (vnode.state.requestMirror) {
			vnode.state.requestMirror.setValue(response.request.body || "");
		}

		return m(".result-pane", [
			m(Toolbar, {
				left: [
					m(
						LinkButton,
						{
							onclick() {
								vnode.attrs.workspaceBeacon?.do("run-again");
							},
						},
						"Run Again"
					),
				],
			}),
			m(".body", [
				m("ul.messages", [
					history.length > 0 && m("li",
						`Redirected ${history.length === 1 ? "once" : history.length + "times"}.` +
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
					)
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

		const rows: m.Vnode[] = [];

		for (const [name, value] of headers) {
			rows.push(m("tr", [
				m("td", name.replace(/\b\w/g, stringUpperCase)),
				m("td", value),
			]));
		}

		return m(Table, rows);
	}

	function renderResponse(response) {
		const responseContentType = getContentTypeFromHeaders(response && response.headers);
		const requestContentType = getContentTypeFromHeaders(response && response.request.headers);

		return response && m("div.response", [
			m(
				"h2",
				{ class: "status s" + response.status.toString()[0] + "xx" },
				`${response.status} ${response.statusText}`
			),
			m("pre.url", response.request.method + " " + response.url),
			m("h2", "Response"),
			m("h3", "Body"),
			m(CodeBlock, { text: response.body, spec: responseContentType }),
			m("h3", "Headers"),
			(renderHeaders(response.headers)) || m("p", "Nothing here."),
			m("h2", "Request"),
			m("h3", "Body"),
			m(CodeBlock, { text: response.request.body, spec: requestContentType }),
			m("h3", "Headers"),
			(renderHeaders(response.request.headers)) || m("p", "Nothing here."),
		]);
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
}

const PageEnd = {
	view: () => m(
		"p",
		{ style: { margin: "2em 0 3em", textAlign: "center", fontSize: "2em" } },
		"❦"
	)
}

const CookiesModal = {
	view: vnode => m(".modal", [
		m("header", m("h2", "Cookies")),
		m("section", [
			m("pre", "this.cookies = " + JSON.stringify(vnode.attrs.cookies, null, 2)),
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
}

const Table = {
	view: vnode => vnode.children && vnode.children.length > 0 &&
		m(".table-box", m("table", m("tbody", vnode.children)))
}

const LinkButton = {
	view: vnode => m(
		"a",
		{
			class: "button" + (vnode.attrs.isActive ? " active" : ""),
			href: vnode.attrs.href || "#",
			target: "_blank",  // TODO: Set this to _blank *only* for external links.
			onclick(event) {
				if (event.target.getAttribute("href") === "#" || event.target.getAttribute("href") === "") {
					event.preventDefault();
				}
				if (vnode.attrs.onclick) {
					vnode.attrs.onclick(event);
				}
			},
		},
		vnode.children
	)
}

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
