import m, { VnodeDOM } from "mithril";
import CodeBlock from "./CodeBlock";
import OptionsModal from "./Options";
import Workspace from "./Workspace";
import { NothingMessage } from "./NothingMessage";
import firebase from "firebase/app";
import "firebase/firebase-app";
import AuthController from "./AuthService";
import { DocumentBrowser } from "./DocumentBrowser";
import { PageEnd } from "./PageEnd";
import { Modal } from "./Modal";
import Button from "./Button";
import { LinkButton } from "./LinkButton";
import { ChevronDown, ExternalLink } from "./Icons";

declare const process: { env: any };

window.addEventListener("load", () => {
	const root = document.createElement("div");
	root.setAttribute("id", "app");
	// root.classList.add("h-screen", "max-h-screen", "overflow-hidden", "grid", "grid-cols-2");
	document.body.insertAdjacentElement("afterbegin", root);
	document.getElementById("loadingBox")?.remove();
	m.route(root, "/doc/master", {
		"/doc/:docName...": WorkspaceView,
	});

	firebase.initializeApp({
		apiKey: process.env.PRESTIGE_FIRESTORE_API_KEY,
		authDomain: process.env.PRESTIGE_FIRESTORE_AUTH_DOMAIN,
		databaseURL: process.env.PRESTIGE_FIRESTORE_DATABASE_URL,
		projectId: process.env.PRESTIGE_FIRESTORE_PROJECT_ID,
		storageBucket: process.env.PRESTIGE_FIRESTORE_STORAGE_BUCKET,
		messagingSenderId: process.env.PRESTIGE_FIRESTORE_MESSAGING_SENDER_ID,
		appId: process.env.PRESTIGE_FIRESTORE_APP_ID,
	});

	AuthController.init();
});

function WorkspaceView(): m.Component {
	const workspace = new Workspace();

	enum VisiblePopup {
		None,
		// eslint-disable-next-line no-shadow
		DocumentBrowser,
		Options,
		Cookies,
		LoginForm,
	}

	let popup: VisiblePopup = VisiblePopup.None;

	return {
		view,
		oncreate,
		oninit: loadStorage,
		onupdate: loadStorage,
	};

	function loadStorage(vnode) {
		if (workspace.storage == null || vnode.attrs.docName !== workspace.storage.name) {
			workspace.loadStorage(vnode.attrs.docName);
			popup = VisiblePopup.None;
		}
	}

	function oncreate() {
		document.addEventListener("keydown", event => {
			if (event.key === "Escape") {
				workspace.codeMirror?.focus();
			}
		});
	}

	function view() {
		const authState = AuthController.getAuthState();
		return [
			m("main.h-100", [
				m("header.flex.items-center.justify-between", [
					m(".flex.items-center", [
						m("h1.text-2xl", "Prestige"),
						m("span", { style: { marginLeft: "1em" } }, m("em", "Just an HTTP client by Shrikant.")),
					]),
					m(".flex.items-center", [
						m(
							LinkButton,
							{ onclick: onDocumentBrowserToggle, isActive: popup === VisiblePopup.DocumentBrowser },
							["Doc: ", workspace.storage.name, m(ChevronDown)],
						),
						m(
							LinkButton,
							{ onclick: onCookiesToggle, isActive: popup === VisiblePopup.Cookies },
							[`Cookies (${ workspace.cookieJar.size }) `, m(ChevronDown)],
						),
						m(
							LinkButton,
							{ onclick: onOptionsToggle, isActive: popup === VisiblePopup.Options },
							["Options ", m(ChevronDown)],
						),
						authState === AuthController.AuthState.PENDING && m.trust("&middot; &middot; &middot;"),
						authState === AuthController.AuthState.ANONYMOUS && m(
							LinkButton,
							{ onclick: onLoginFormToggle, isActive: popup === VisiblePopup.LoginForm },
							"LogIn/SignUp",
						),
						authState === AuthController.AuthState.LOGGED_IN && m(
							LinkButton,
							{ onclick: AuthController.logout },
							[
								AuthController.getCurrentUser()?.displayName || AuthController.getCurrentUser()?.email,
								": Log out",
							],
						),
						m(LinkButton, { href: "help.html" }, ["Help", m(ExternalLink)]),
						m(LinkButton, { href: "https://github.com/sharat87/prestige" }, ["GitHub", m(ExternalLink)]),
					]),
				]),
				m(".er-pair.flex.items-stretch.justify-stretch", [
					m(EditorPane, { workspace }),
					m(ResultPane, { workspace }),
				]),
				popup === VisiblePopup.DocumentBrowser && m(
					Modal,
					{
						header: m("h2", "Documents"),
						footer: [
							m("div"),
							m("div", m("button", { type: "button", onclick: onDocumentBrowserToggle }, "Close")),
						],
					},
					m(DocumentBrowser),
				),
				popup === VisiblePopup.Options && m(OptionsModal, {
					doClose: onOptionsToggle,
				}),
				popup === VisiblePopup.Cookies && m(CookiesModal, {
					cookies: workspace.cookieJar,
					onClose: onCookiesToggle,
					onClear: onClearCookies,
				}),
				popup === VisiblePopup.LoginForm && m(LoginFormModal, {
					onClose: onLoginFormToggle,
				}),
			]),
		];
	}

	function onDocumentBrowserToggle() {
		popup = popup === VisiblePopup.DocumentBrowser ? VisiblePopup.None : VisiblePopup.DocumentBrowser;
	}

	function onCookiesToggle() {
		popup = popup === VisiblePopup.Cookies ? VisiblePopup.None : VisiblePopup.Cookies;
		m.redraw();
	}

	function onLoginFormToggle() {
		popup = popup === VisiblePopup.LoginForm ? VisiblePopup.None : VisiblePopup.LoginForm;
		m.redraw();
	}

	function onClearCookies() {
		workspace.cookieJar.clear();
	}

	function onOptionsToggle() {
		popup = popup === VisiblePopup.Options ? VisiblePopup.None : VisiblePopup.Options;
		m.redraw();
	}
}

const Toolbar = {
	view: vnode => m(".toolbar", (vnode.attrs.left || vnode.attrs.right) && [
		m(".bar", [
			m(".left", vnode.attrs.left),
			m(".right", vnode.attrs.right),
		]),
		// TODO: Can we use `vnode.children` instead of `vnode.attrs.peripherals`?
		m(".peripherals", vnode.attrs.peripherals),
	]),
};

function EditorPane(): m.Component<{ class?: string, workspace: Workspace }> {
	return { view, oncreate };

	function oncreate(vnode: VnodeDOM<{ class?: string, workspace: Workspace }>): void {
		if (!(vnode.dom.firstElementChild instanceof HTMLElement)) {
			throw new Error(
				"CodeMirror for Editor cannot be initialized unless `vnode.dom.firstElementChild` is an HTMLElement.",
			);
		}

		vnode.attrs.workspace.initCodeMirror(vnode.dom.firstElementChild);
	}

	function view(vnode: VnodeDOM<{ class?: string, workspace: Workspace }>): m.Vnode {
		vnode.attrs.workspace.doFlashes();
		vnode.attrs.workspace.codeMirror?.refresh();
		return m(".editor-pane", m(".body"));
	}
}

function ResultPane(): m.Component<{ class?: string, workspace: Workspace }> {
	return { view };

	function view(vnode/*: VnodeDOM<{ class?: string, workspace: Workspace }>*/) {
		const workspace = vnode.attrs.workspace;
		const { result, isLoading } = workspace.session;

		if (isLoading) {
			return m(".result-pane.loading", { class: vnode.attrs.class }, [
				m("p", m.trust("Loading&hellip;")),
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
				left: [
					m(LinkButton, { onclick: workspace.runAgain }, "Run Again"),
					m(LinkButton, { onclick: () => { alert("Work in progress") } }, "Find in Editor"),
				],
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
						],
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

		const category = {
			2: "success",
			3: "info",
			4: "danger",
			5: "danger",
		}[response.status.toString()[0]] || "warning";

		return response && m(".response", [
			m(
				".notification.is-size-3.py-0.my-4.is-radiusless.is-" + category,
				`${ response.status } ${ response.statusText }`,
			),
			m("pre.url", response.request.method + " " + response.url),
			m("a", { href: response.url, target: "_blank" }, "Open GET request URL in new tab"),
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

function RichDataViewer(): m.Component<{ text: string, spec: null | string }> {
	enum Tabs {
		text,
		svgSafe,
		iFrame,
	}

	let visibleTab = Tabs.text;

	return { view };

	function view(vnode: VnodeDOM<{ text: string, spec: null | string }>) {
		let { text } = vnode.attrs;
		const { spec } = vnode.attrs;

		if (text == null) {
			text = "";
		}

		return [
			text === "" ? m("p.is-italic", "No body.") : [
				m("h3", [
					"Body ",
					spec != null && m("small", ` (${ spec })`),
				]),
				m(".tabs", m("ul.ml-0.mt-0", [
					m("li", {class: visibleTab === Tabs.text ? "is-active" : ""}, m("a", {
						onclick() {
							visibleTab = Tabs.text;
						},
					}, "Text")),
					(spec === "text/html" || spec === "image/svg+xml") && [
						m("li", {class: visibleTab === Tabs.iFrame ? "is-active" : ""}, m("a", {
							onclick() {
								visibleTab = Tabs.iFrame;
							},
						}, "iFrame")),
					],
					spec === "image/svg+xml" && [
						m("li", {class: visibleTab === Tabs.svgSafe ? "is-active" : ""}, m("a", {
							onclick() {
								visibleTab = Tabs.svgSafe;
							},
						}, "Image")),
					],
				])),
			],
			m("div",
				{ style: { padding: 0, display: (text !== "" && visibleTab === Tabs.text) ? "" : "none" } },
				m(CodeBlock, {
					text,
					spec,
				}),
			),
			visibleTab === Tabs.iFrame && m("iframe", {
				src: "data:text/html;base64," + btoa(text),
				sandbox: "",  // Disable scripts and whole lot of scary stuff in the frame's document.
			}),
			visibleTab === Tabs.svgSafe && m("img", { src: "data:image/svg+xml;base64," + btoa(text) }),
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
	},
};

const CookiesModal = {
	view: vnode => m(
		Modal,
		{
			title: "Cookies",
			footer: [
				vnode.attrs.cookies?.size > 0 && m(
					Button,
					{ class: "is-light is-danger", onclick: vnode.attrs.onClear },
					"Clear all cookies",
				),
				m(Button, { onclick: vnode.attrs.onClose }, "Close"),
			],
		},
		[
			m("p.notification.is-info.mt-0", { style: { marginTop: "2em" } }, "These cookies will be used for requests" +
				" executed by proxy only. For requests that are executed without a proxy, please refer to the browser" +
				" console. This is a browser-level security restriction."),
			m("pre", "this.cookies = " + JSON.stringify(vnode.attrs.cookies, null, 2)),
		],
	),
};

const LoginFormModal = function (initialVnode) {
	const { onClose } = initialVnode.attrs;
	return { view, oncreate };

	function view() {
		return m(
			Modal,
			{
				title: "LogIn / SignUp",
				footer: [
					m(Button, { onclick: onClose }, "Close"),
				],
			},
			[
				m("h2", { style: { textAlign: "center" } }, "LogIn"),
				m("form", { style: { width: "60%" }, onsubmit: onLoginSubmit }, [
					m(".field.is-horizontal", [
						m(".field-label.is-normal", m("label", { for: "loginEmail" }, "Email")),
						m(".field-body", m(".field", m("p.control",
							m("input.input", { id: "loginEmail", type: "email", required: true }),
						))),
					]),
					m("label", { for: "loginPassword" }, "Password"),
					m("input", { id: "loginPassword", type: "password", required: true, minlength: 6 }),
					m("p", { style: { "grid-column-end": "span 2", textAlign: "center" } }, [
						m(Button, { isPrimary: true, type: "submit" }, "Log in!"),
					]),
				]),
				m("h2", { style: { textAlign: "center", marginTop: "2em" } }, "SignUp"),
				m("form.grid", { style: { width: "60%" }, onsubmit: onSignupSubmit }, [
					m("label", { for: "signupEmail" }, "Email"),
					m("input", { id: "signupEmail", type: "email", required: true }),
					m("label", { for: "signupPassword" }, "Password"),
					m("input", { id: "signupPassword", type: "password", required: true, minlength: 6 }),
					m("label", { for: "signupPasswordRepeat" }, "Password (Repeat)"),
					m("input", { id: "signupPasswordRepeat", type: "password", required: true, minlength: 6 }),
					m("p", { style: { "grid-column-end": "span 2", textAlign: "center" } }, [
						m(Button, { isPrimary: true, type: "submit" }, "Sign up!"),
					]),
				]),
			],
		);
	}

	function oncreate(vnode) {
		vnode.dom.querySelector("input[type=email]").focus();
	}

	function onLoginSubmit(event) {
		event.preventDefault();
		AuthController.login(event.target.loginEmail.value, event.target.loginPassword.value)
			.then(user => {
				console.log("User logged in", user);
				onClose();
			})
			.catch(error => {
				console.error("Error logging in", error);
				alert("Error logging in: [" + error.code + "] " + error.message);
			});
	}

	function onSignupSubmit(event) {
		event.preventDefault();

		const password = event.target.signupPassword.value;

		if (password !== event.target.signupPasswordRepeat.value) {
			alert("The passwords don't match. Please repeat the same password and then click Sign Up.");
			return;
		}

		AuthController.signup(event.target.signupEmail.value, password)
			.then(user => {
				console.log("User signed up", user);
				onClose();
			})
			.catch(error => {
				console.error("Error signing up", error);
				alert("Error signing up: [" + error.code + "] " + error.message);
			});
	}

};

const Table = {
	view: vnode => vnode.children && vnode.children.length > 0 &&
		m(".table-container", m("table.table.is-bordered.is-family-monospace", m("tbody", vnode.children))),
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
