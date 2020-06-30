import m from "mithril";
import Mustache from "mustache";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import CodeMirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/addon/selection/active-line";
import "codemirror/theme/elegant.css";

import HttpSession from "./HttpSession";

// Expected environment variables.
declare var process: { env: { PRESTIGE_PROXY_URL: string } };

window.addEventListener("load", () => {
	const root = document.createElement("div");
	root.setAttribute("id", "app");
	document.body.insertAdjacentElement("afterbegin", root);
	m.mount(root, MainView);
	document.getElementById("loadingBox")?.remove();
});

Mustache.escape = function (text) {
	return text;
};

CodeMirror.defineMode("prestige", (config, parserConfig) => {
	return { startState, token };

	function startState() {
		return {
			inJavascript: false,
		};
	}

	function token(stream, state) {
		if (stream.match("###")) {
			stream.eatSpace();
			state.inJavascript = stream.match("javascript");
			stream.skipToEnd();
			return "variable-2";
		}

		if (stream.eat("#")) {
			stream.skipToEnd();
			return "comment";
		}

		stream.skipToEnd();

		if (state.inJavascript) {
			return "string";
		}

		return null;
	}
});

function MainView() {
	let isOptionsVisible = false;
	let isCookiesVisible = false;

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
						// m("a", { href: "#", onclick: onCookiesToggle, class: isCookiesVisible ? "active" : "" }, "Cookies"),
						m(LinkButton, { href: "https://github.com/sharat87/prestige" }, "GitHub"),
						m(LinkButton, { onclick: onOptionsToggle, isActive: isOptionsVisible }, "Options"),
					]),
				]),
				m(Workspace),
				isOptionsVisible && m(OptionsModal, { doSave: onOptionsSave, doClose: onOptionsToggle }),
				isCookiesVisible && m(CookiesModal, { doClose: onCookiesToggle }),
			]),
		];
	}

	function onCookiesToggle(event) {
		if (event) {
			event.preventDefault();
		}
		isCookiesVisible = !isCookiesVisible;
		m.redraw();
	}

	function onOptionsToggle() {
		isOptionsVisible = !isOptionsVisible;
		m.redraw();
	}

	function onOptionsSave() {
		console.warn("WIP Save & apply options");
		m.redraw();
	}
}

function Workspace() {
	const client = new HttpSession(process.env.PRESTIGE_PROXY_URL);

	return { view };

	function view() {
		return m("div.er-pair", [
			m(EditorPane, { onExecute, cookies: client.cookies }),
			m(ResultPane, { client }),
		]);
	}

	function onExecute(codeMirror) {
		const lines = codeMirror.getValue().split("\n");
		const cursorLine = codeMirror.getCursor().line;
		client.runTop(lines, cursorLine)
			.finally(m.redraw);
	}
}

function Toolbar() {
	return { view };

	function view(vnode) {
		return m("div.toolbar", [
			m(".bar", [
				m("div.left", vnode.attrs.left),
				m("div.right", vnode.attrs.right),
			]),
			// TODO: Can we use `vnode.children` instead of `vnode.attrs.peripherals`?
			m(".peripherals", vnode.attrs.peripherals),
		]);
	}
}

function EditorPane(initialVnode) {
	let { onExecute } = initialVnode.attrs;
	let isCookiesPopupVisible = false;

	return { view };

	function onEditorChanges(value) {
		localStorage.setItem("content1", value);
	}

	function view(vnode) {
		onExecute = vnode.attrs.onExecute;
		return m(
			"div.editor-pane",
			[
				m(CodeMirrorEditor, {
					content: localStorage.getItem("content1") ||
						"GET http://httpbin.org/get?name=haha\n\n###\n\nPOST http://httpbin.org/post\nContent-Type: application/x-www-form-urlencoded\n\nusername=sherlock&password=elementary\n",
					onUpdate: onEditorChanges,
					onExecute: onExecuteCb,
				}),
				m(Toolbar, {
					right: [
						m(
							LinkButton,
							{ onclick: toggleCookiesPopup, isActive: isCookiesPopupVisible },
							[
								"Cookies",
								vnode.attrs.cookies && vnode.attrs.cookies.length > 0 && ` (${vnode.attrs.cookies.length})`,
							],
						),
					],
					peripherals: [
						isCookiesPopupVisible && m(CookiesModal, { onClose: toggleCookiesPopup, cookies: vnode.attrs.cookies }),
					],
				}),
			]
		);
	}

	function onExecuteCb(codeMirror) {
		if (codeMirror.somethingSelected()) {
			alert("Running a selection is not supported yet.");
		}

		onExecute(codeMirror);
	}

	function toggleCookiesPopup() {
		isCookiesPopupVisible = !isCookiesPopupVisible;
		m.redraw();
	}
}

function CodeMirrorEditor() {
	let content = "";
	let onUpdate: null | Function = null;

	// noinspection JSUnusedGlobalSymbols
	return { view, oncreate };

	function oncreate(vnode) {
		content = vnode.attrs.content || "";
		const editor = CodeMirror(vnode.dom, {
			theme: "elegant",
			mode: "prestige",
			lineNumbers: true,
			autofocus: true,
			styleActiveLine: true,
			value: content,
		});
		editor.setOption("extraKeys", {
			"Ctrl-Enter": vnode.attrs.onExecute,
			"Cmd-Enter": vnode.attrs.onExecute,
		});
		editor.on("changes", onChanges);
		onUpdate = vnode.attrs.onUpdate;
	}

	function onChanges(codeMirror) {
		content = codeMirror.getValue();
		if (onUpdate) {
			onUpdate(content);
		}
	}

	function view() {
		return m(".body");
	}
}

function ResultPane() {
	return { view };

	function view(vnode) {
		const { result, isLoading } = vnode.attrs.client;

		if (isLoading) {
			return m("div.result-pane.loading", m("p", m.trust("Loading&hellip;")));
		}

		if (result == null) {
			return null;
		}

		if (!result.ok) {
			return m("div.result-pane.error", [
				m("div.body", [
					m("h2", "Error executing request"),
					m("p", result.error.message),
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
							Object.entries(result.request).map(([name, value]) => {
								return name !== "method" && name !== "url" && m("tr", [
									m("th", name.replace(/\b\w/g, stringUpperCase)),
									m("td", typeof value === "string" ? value : JSON.stringify(value, null, 2)),
								])
							}),
						]),
					],
					m(PageEnd),
				]),
				m("div.toolbar"),
			]);
		}

		const { response, history } = result;

		if (vnode.state.responseMirror) {
			vnode.state.responseMirror.setValue(response.body);
		}

		if (vnode.state.requestMirror) {
			vnode.state.requestMirror.setValue(response.request.body || "");
		}

		return m("div.result-pane", [
			m("div.body", [
				history.length > 0 && m(
					"p.redirection-message",
					`Request redirected ${history.length === 1 ? "once" : history.length + "times"}.` +
					" Scroll down for more details."
				),
				m("p", { style: { padding: "0 6px" } }, m.trust("Request finished in <b>" + result.timeTaken + "ms</b>.")),
				renderResponse(response),
				history ? history.map(renderResponse).reverse() : null,
				m(PageEnd),
			]),
			m(Toolbar, {
				left: [
					m(
						LinkButton,
						{ onclick: () => alert("click WIP") },
						"Result related tools: WIP"
					),
				],
			}),
		]);
	}

	function renderHeaders(headers) {
		if (headers == null) {
			return null;
		}

		const rows: any[] = [];

		for (const [name, value] of headers) {
			rows.push(m("tr", [
				m("td", name.replace(/\b\w/g, stringUpperCase)),
				m("td", value),
			]));
		}

		return rows.length > 0 ? m("div.table-box", m("table", m("tbody", rows))) : null;
	}

	function renderResponse(response) {
		const responseContentType = getContentTypeFromHeaders(response && response.headers);
		const requestContentType = getContentTypeFromHeaders(response && response.request.headers);

		console.log("response.body", response.body);

		return response && m("div.response", [
			m(
				"h2",
				{ class: "status s" + response.status.toString()[0] + "xx" },
				`${response.status} ${response.statusText}`
			),
			m("pre.url", response.request.method + " " + response.url),
			m("h2", "Response"),
			m("h3", "Body"),
			m(CodeBlock, { content: response.body, language: responseContentType ? responseContentType.split("/")[1] : null }),
			m("h3", "Headers"),
			(renderHeaders(response.headers)) || m("p", "Nothing here."),
			m("h2", "Request"),
			m("h3", "Body"),
			m(CodeBlock, { content: response.request.body, language: requestContentType ? requestContentType.split("/")[1] : null }),
			m("h3", "Headers"),
			(renderHeaders(response.request.headers)) || m("p", "Nothing here."),
		]);
	}
}

function CodeBlock() {
	return { view };

	function view(vnode) {
		let { content, language } = vnode.attrs;

		if (content == null || content === "") {
			return m("p", m("em", "Nothing"));
		}

		if (typeof content !== "string") {
			content = JSON.stringify(content);
		}

		let i = 0;
		const prettyContent = prettify(content, language);

		return m("pre", [
			m(".line-numbers", prettyContent.split(/\r?\n/).map(() => m("div", ++i))),
			m(
				"code", language && Prism.languages[language]
					? m.trust(Prism.highlight(prettyContent, Prism.languages[language], language))
					: prettyContent
			),
		]);
	}
}

function PageEnd() {
	return { view };

	function view() {
		return m("p", { style: { margin: "2em 0 3em", "text-align": "center", "font-size": "2em" } }, "❦");
	}
}

function OptionsModal() {
	return { view };

	function view(vnode) {
		return [
			// m("div.mask"),
			m("div.modal", [
				m("header", m("h2", "Options")),
				m("section.form", [
					m("span", "Dark Mode"),
					m("div", [
						m("label", { title: "Sync to system's dark mode setting" }, [
							m("input", { type: "radio", name: "darkMode", value: "auto" }),
							m("span", "Auto"),
						]),
						m("label", [
							m("input", { type: "radio", name: "darkMode", value: "light" }),
							m("span", "Light"),
						]),
						m("label", [
							m("input", { type: "radio", name: "darkMode", value: "dark" }),
							m("span", "Dark"),
						]),
					]),
				]),
				m("footer", [
					m("button.primary", { type: "button", onclick: vnode.attrs.doSave }, "Save"),
					m("button", { type: "button", onclick: vnode.attrs.doClose }, "Cancel"),
				]),
			]),
		];
	}
}

function CookiesModal() {
	return { view };

	function view(vnode) {
		return [
			// m("div.mask"),
			m("div.popup.right", [
				m("header", m("h2", "Cookies")),
				m("section", [
					m("pre", "this.cookies = " + JSON.stringify(vnode.attrs.cookies, null, 2)),
					m(PageEnd),
				]),
				m("footer", [
					// m("button.primary", { type: "button", onclick: vnode.attrs.doSave }, "Save"),
					m("button", { type: "button", onclick: vnode.attrs.onClose }, "Close"),
				]),
			]),
		];
	}
}

function Table() {
	return { view };

	function view(vnode) {
		return m(".table-box", m("table", m("tbody", vnode.children)));
	}
}

function LinkButton() {
	return { view };

	function view(vnode) {
		return m(
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
		);
	}
}

function prettify(content, language) {
	if (language === "json") {
		return prettifyJson(content);
	}
	return content;
}

function prettifyJson(json) {
	try {
		return JSON.stringify(JSON.parse(json), null, 2);
	} catch (error) {
		// TODO: The fact that this JSON is invalid should be communicated to the user.
		console.error("Error parsing/prettifying JSON.");
		return json;
	}
}

function getContentTypeFromHeaders(headers) {
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
