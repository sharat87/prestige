import type { Vnode, VnodeDOM } from "mithril"
import m from "mithril"
import OptionsModal, { editorFontOption, editorFontSizeOption } from "_/Options"
import Workspace from "_/Workspace"
import * as AuthService from "_/AuthService"
import { DocumentBrowser } from "_/DocumentBrowser"
import * as Icons from "_/Icons"
import CookiesModal from "_/CookiesModal"
import LoginFormModal from "_/LoginFormModal"
import FileBucketModal from "_/FileBucketModal"
import ColorPaletteModal from "_/ColorPaletteModal"
import { NavLink } from "_/NavLink"
import ResultPane from "_/ResultPane"
import { isDev } from "_/Env"
import Toaster from "_/Toaster"
import ExternalLink from "_/ExternalLink"
import ModalManager from "_/ModalManager"

window.addEventListener("load", main)

function main() {
	const root = document.createElement("main")
	root.setAttribute("id", "app")
	root.classList.add("h-100")
	document.body.insertAdjacentElement("afterbegin", root)
	document.getElementById("loadingBox")?.remove()

	m.route(root, "/doc/browser/master", {
		"/doc/:path...": {
			render: (vnode: Vnode) => m(Layout, m(WorkspaceView, vnode.attrs)),
		},
		// TODO: "/:404...": errorPageComponent,
	})

	// AuthService.check()  // TODO: Enable when auth is enabled in prod.
}

const Layout: m.Component = {
	view(vnode: m.VnodeDOM): m.Children {
		return [
			vnode.children,
			m(".toasts.pa4.fixed.right-0.top-0", Toaster.map(toast => m(
				".f5.pa3.mb2.br2.shadow-2",
				{
					class: {
						success: "bg-washed-green dark-green",
						danger: "bg-washed-red dark-red",
					}[toast.type],
					key: toast.id,
					onbeforeremove({ dom }: m.VnodeDOM): Promise<Event> {
						dom.classList.add("close")
						return new Promise(resolve => {
							dom.addEventListener("animationend", resolve)
						})
					},
				},
				[
					m("button.bn.br-pill.fr.pointer", {
						type: "button",
						class: {
							success: "bg-light-green dark-green",
							danger: "bg-light-red dark-red",
						}[toast.type],
						onclick(event: Event) {
							(event.target as HTMLButtonElement).style.display = "none"
							Toaster.remove(toast.id)
						},
					}, m.trust("&times;")),
					toast.id + ": " + toast.message,
				],
			))),
		]
	},
}

function WorkspaceView(): m.Component {
	const workspace = new Workspace()
	let redrawCount = 0

	const enum VisiblePopup {
		AboutPane,
		ColorPalette,
		Cookies,
		DocumentBrowserPopup,
		FileBucketPopup,
		LoginForm,
		None,
		Options,
	}

	let popup: VisiblePopup = VisiblePopup.None

	return {
		view,
		oncreate,
		onremove,
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
		document.addEventListener("keydown", onKeyDown)
	}

	function onremove() {
		document.removeEventListener("keydown", onKeyDown)
	}

	function onKeyDown(event: KeyboardEvent) {
		if (event.key === "Escape") {
			ModalManager.close()
			if (popup !== VisiblePopup.None) {
				popup = VisiblePopup.None
				m.redraw()
			}
			workspace.codeMirror?.focus()
		}
	}

	function view() {
		const authState = AuthService.getAuthState()
		return [
			m("header", [
				m(".flex.items-end", [
					m("h1.f3.mh2.mv0", "Prestige"),
					m(".f6.i.ml3", [
						"Just an HTTP client by ",
						m("a", { href: "https://sharats.me", target: "_blank" }, "Shrikant"),
						".",
					]),
				]),
				m(".flex.items-stretch", [
					!workspace.isChangesSaved && m(".i.pv1.ph2.db.flex.items-center.silver", "Unsaved"),
					isDev() && m(
						"code.flex.items-center.ph1",
						{ style: { lineHeight: 1.15, color: "var(--red-3)", background: "var(--red-9)" } },
						["R", ++redrawCount],
					),
					isDev() && m(
						NavLink,
						{ onclick: onColorPaletteToggle, isActive: ModalManager.isShowing(VisiblePopup.ColorPalette) },
						"Palette",
					),
					m(
						NavLink,
						{
							onclick: onDocumentBrowserToggle,
							isActive: ModalManager.isShowing(VisiblePopup.DocumentBrowserPopup),
						},
						["📃 Sheet: ", workspace.currentSheetQualifiedPath()],
					),
					m(
						NavLink,
						{ onclick: onCookiesToggle, isActive: ModalManager.isShowing(VisiblePopup.Cookies) },
						`🍪 Cookies (${ workspace.cookieJar?.size ?? 0 })`,
					),
					m(
						NavLink,
						{ onclick: onFileBucketToggle, isActive: ModalManager.isShowing(VisiblePopup.FileBucketPopup) },
						`🗃 FileBucket (${workspace.fileBucket.size})`,
					),
					m(
						NavLink,
						{ onclick: onOptionsToggle, isActive: ModalManager.isShowing(VisiblePopup.Options) },
						"⚙️ Options",
					),
					m(
						NavLink,
						{ onclick: onAboutPaneToggle, isActive: ModalManager.isShowing(VisiblePopup.AboutPane) },
						"🎒 About",
					),
					isDev() && [
						authState === AuthService.AuthState.PENDING && m.trust("&middot; &middot; &middot;"),
						authState === AuthService.AuthState.ANONYMOUS && m(
							NavLink,
							{ onclick: onLoginFormToggle, isActive: ModalManager.isShowing(VisiblePopup.LoginForm) },
							"🕵️‍♀️ LogIn/SignUp",
						),
						authState === AuthService.AuthState.LOGGED_IN && m(
							NavLink,
							{ onclick: AuthService.logout },
							[AuthService.email(), ": Log out"],
						),
					],
					m(NavLink, { href: "/docs/" }, ["Docs", m(Icons.ExternalLink)]),
					m(NavLink, { href: "https://github.com/sharat87/prestige" }, ["GitHub", m(Icons.ExternalLink)]),
				]),
			]),
			m(".er-pair.flex.items-stretch.justify-stretch", [
				m(EditorPane, { workspace }),
				m(ResultPane, { workspace }),
				m("style", "body { --monospace-font: '" + editorFontOption() + "'; }"),
				m("style", "body { --monospace-font-size: " + editorFontSizeOption() + "px; }"),
			]),
			ModalManager.render(),
		]
	}

	function onAboutPaneToggle() {
		ModalManager.toggleDrawer(
			m(ModalManager.DrawerLayout, { title: "About" }, m(AboutModal)),
			VisiblePopup.AboutPane,
		)
	}

	function onDocumentBrowserToggle() {
		ModalManager.toggleDrawer(m(DocumentBrowser), VisiblePopup.DocumentBrowserPopup)
	}

	function onCookiesToggle() {
		ModalManager.toggleDrawer(
			m(CookiesModal, { cookieJar: workspace.cookieJar, workspace }),
			VisiblePopup.Cookies,
		)
	}

	function onFileBucketToggle() {
		ModalManager.toggleDrawer(
			m(FileBucketModal, { fileBucket: workspace.fileBucket }),
			VisiblePopup.FileBucketPopup,
		)
	}

	function onLoginFormToggle() {
		ModalManager.toggleDrawer(m(LoginFormModal), VisiblePopup.LoginForm)
	}

	function onOptionsToggle() {
		ModalManager.toggleDrawer(m(OptionsModal), VisiblePopup.Options)
	}

	function onColorPaletteToggle() {
		ModalManager.toggleDrawer(m(ColorPaletteModal), VisiblePopup.ColorPalette)
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
		const { workspace } = vnode.attrs
		workspace.doFlashes()
		workspace.codeMirror?.refresh()
		return m(".editor-pane", m(".body", {
			onclick(event: Event) {
				if ((event.target as HTMLElement).matches("span.cm-link")) {
					window.open((event.target as HTMLElement).innerText, "_blank", "noopener")
				}
			},
		}))
	}
}

const AboutModal: m.Component = {
	view() {
		return m(
			"div.f3.ph4",
			[
				m("h3", "Hello there! 👋"),
				m(
					"p",
					"My name is Shrikant. I built Prestige because I needed an app like this when working" +
						" with APIs and playing with external APIs.",
				),
				m(
					"p",
					[
						"Check out my blog at ",
						m("a", { href: "https://sharats.me", target: "_blank" }, "sharats.me"),
						". You can also find me on ",
						m(ExternalLink, { href: "https://github.com/sharat87" }, "GitHub"),
						" or ",
						m(ExternalLink, { href: "https://twitter.com/sharat87" }, "Twitter"),
						" or ",
						m(ExternalLink, { href: "https://www.linkedin.com/in/sharat87" }, "LinkedIn"),
						", althought I'm not quite active on those platforms.",
					],
				),
				m(
					"p",
					[
						"If you like Prestige, please consider ",
						m(
							ExternalLink,
							{ href: "https://github.com/sharat87/prestige" },
							"starring the project on GitHub",
						),
						". It'll help improve the project's visibility and works as indication that this " +
							"project is indeed a useful tool. Thank you! 🙏",
					],
				),
				m(
					"p",
					[
						"If you found a bug or have a feature request, please ",
						m(
							ExternalLink,
							{ href: "https://github.com/sharat87/prestige/issues" },
							"open an issue",
						),
						" on the GitHub project page.",
					],
				),
			],
		)
	},
}
