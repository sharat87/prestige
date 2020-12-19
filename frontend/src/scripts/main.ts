import type { VnodeDOM } from "mithril"
import m from "mithril"
import OptionsModal from "./Options"
import Workspace from "./Workspace"
import AuthController from "./AuthService"
import { DocumentBrowser } from "./DocumentBrowser"
import Modal from "./Modal"
import Button from "./Button"
import { ChevronDown, ExternalLink } from "./Icons"
import CookiesModal from "./CookiesModal"
import LoginFormModal from "./LoginFormModal"
import { NavLink } from "./NavLink"
import ResultPane from "./ResultPane"
import { isDev } from "./Env"
import { email } from "./AuthService"

// TODO: UI Freezes when the response body is 1.6MB JSON. Like with `GET https://api.github.com/graphql`.

window.addEventListener("load", () => {
	const root = document.createElement("main")
	root.setAttribute("id", "app")
	root.classList.add("sans-serif", "h-100")
	document.body.insertAdjacentElement("afterbegin", root)
	document.getElementById("loadingBox")?.remove()

	m.route(root, "/doc/browser/master", {
		"/doc/:path...": WorkspaceView,
		// "/:404...": errorPageComponent,
	})

	AuthController.check()
})

function WorkspaceView(): m.Component {
	const workspace = new Workspace()

	const enum VisiblePopup {
		None,
		DocumentBrowser,
		Options,
		Cookies,
		LoginForm,
	}

	let popup: VisiblePopup = VisiblePopup.None

	return {
		view,
		oncreate,
		oninit: loadSheet,
		onupdate: loadSheet,
	}

	function loadSheet(vnode: VnodeDOM<{ path: string }>) {
		if (workspace.currentSheetQualifiedPath() !== vnode.attrs.path) {
			workspace.currentSheetQualifiedPath(vnode.attrs.path)
			popup = VisiblePopup.None
		}
	}

	function oncreate() {
		document.addEventListener("keydown", event => {
			if (event.key === "Escape") {
				workspace.codeMirror?.focus()
			}
		})
	}

	function view() {
		const authState = AuthController.getAuthState()
		return [
			m("header.flex.items-stretch.justify-between.bg-white.relative.bb.b--moon-gray", [
				m(".flex.items-end", [
					m("h1.f3.mh2.mv0", "Prestige"),
					m(".f6.i.ml3", "Just an HTTP client by Shrikant."),
				]),
				m(".flex.items-stretch", [
					!workspace.isChangesSaved && m(".i.pv1.ph2.db.flex.items-center.silver", "Unsaved"),
					m(
						NavLink,
						{ onclick: onDocumentBrowserToggle, isActive: popup === VisiblePopup.DocumentBrowser },
						["Doc: ", workspace.currentSheetQualifiedPath(), m(ChevronDown)],
					),
					m(
						NavLink,
						{ onclick: onCookiesToggle, isActive: popup === VisiblePopup.Cookies },
						[`Cookies (${ workspace.cookieJar.size }) `, m(ChevronDown)],
					),
					isDev() && m(
						NavLink,
						{ onclick: onOptionsToggle, isActive: popup === VisiblePopup.Options },
						["Options ", m(ChevronDown)],
					),
					authState === AuthController.AuthState.PENDING && m.trust("&middot; &middot; &middot;"),
					authState === AuthController.AuthState.ANONYMOUS && m(
						NavLink,
						{ onclick: onLoginFormToggle, isActive: popup === VisiblePopup.LoginForm },
						"LogIn/SignUp",
					),
					authState === AuthController.AuthState.LOGGED_IN && m(
						NavLink,
						{ onclick: AuthController.logout },
						[
							email(),
							": Log out",
						],
					),
					m(NavLink, { href: "help.html" }, ["Help", m(ExternalLink)]),
					m(NavLink, { href: "https://github.com/sharat87/prestige" }, ["GitHub", m(ExternalLink)]),
				]),
			]),
			m(".er-pair.flex.items-stretch.justify-stretch", [
				m(EditorPane, { workspace }),
				m(ResultPane, { workspace }),
			]),
			popup === VisiblePopup.DocumentBrowser && m(
				Modal,
				{
					title: "Documents (work in progress)",
					footer: [
						m("div"),
						m(
							"div",
							m(Button, { style: "primary", type: "button", onclick: onDocumentBrowserToggle }, "Close"),
						),
					],
				},
				m(DocumentBrowser),
			),
			popup === VisiblePopup.Options && m(OptionsModal, {
				doClose: onOptionsToggle,
			}),
			popup === VisiblePopup.Cookies && m(CookiesModal, {
				cookieJar: workspace.cookieJar,
				onClose: onCookiesToggle,
			}),
			popup === VisiblePopup.LoginForm && m(LoginFormModal, {
				onClose: onLoginFormToggle,
			} as any),
		]
	}

	function onDocumentBrowserToggle() {
		popup = popup === VisiblePopup.DocumentBrowser ? VisiblePopup.None : VisiblePopup.DocumentBrowser
	}

	function onCookiesToggle() {
		popup = popup === VisiblePopup.Cookies ? VisiblePopup.None : VisiblePopup.Cookies
	}

	function onLoginFormToggle() {
		popup = popup === VisiblePopup.LoginForm ? VisiblePopup.None : VisiblePopup.LoginForm
	}

	function onOptionsToggle() {
		popup = popup === VisiblePopup.Options ? VisiblePopup.None : VisiblePopup.Options
	}
}

function EditorPane(): m.Component<{ class?: string, workspace: Workspace }> {
	return { view, oncreate }

	function oncreate(vnode: VnodeDOM<{ class?: string, workspace: Workspace }>): void {
		if (!(vnode.dom.firstElementChild instanceof HTMLElement)) {
			throw new Error(
				"CodeMirror for Editor cannot be initialized unless `vnode.dom.firstElementChild` is an HTMLElement.",
			)
		}

		vnode.attrs.workspace.initCodeMirror(vnode.dom.firstElementChild)
	}

	function view(vnode: VnodeDOM<{ class?: string, workspace: Workspace }>): m.Vnode {
		vnode.attrs.workspace.doFlashes()
		vnode.attrs.workspace.codeMirror?.refresh()
		return m(".editor-pane", m(".body"))
	}
}
