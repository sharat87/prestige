import type { Vnode, VnodeDOM } from "mithril"
import m from "mithril"
import OptionsModal, { editorFontOption, editorFontSizeOption } from "_/Options"
import Workspace from "_/Workspace"
import AuthService from "_/AuthService"
import { AuthState } from "_/AuthService"
import DocumentBrowser from "_/DocumentBrowser"
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
import Toolbar from "_/Toolbar"

window.addEventListener("load", main)

function main() {
	const root = document.createElement("main")
	root.setAttribute("id", "app")
	document.body.insertAdjacentElement("afterbegin", root)
	document.getElementById("loadingBox")?.remove()

	m.route(root, "/doc/browser/master", {
		"/doc/:path...": {
			render: (vnode: Vnode) => m(Layout, m(WorkspaceView, vnode.attrs)),
		},
		// TODO: "/:404...": errorPageComponent,
	})

	if (isDev()) {
		AuthService.check()
	}
}

const Layout: m.Component = {
	view(vnode: m.VnodeDOM): m.Children {
		return [
			vnode.children,
			ModalManager.render(),
			Toaster.render(),
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
		return m("section.top-layout", [
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
						".flex.items-center.ph1",
						["📃 ", workspace.currentSheetQualifiedPath()],
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
					isDev() && [
						authState === AuthState.PENDING
							? m.trust("&middot; &middot; &middot;")
							: m(
								NavLink,
								{
									onclick: onLoginFormToggle,
									isActive: ModalManager.isShowing(VisiblePopup.LoginForm),
								},
								authState === AuthState.LOGGED_IN ? "🦸 Profile" : "🕵️ LogIn/SignUp",
							),
					],
					m(
						NavLink,
						{ onclick: onAboutPaneToggle, isActive: ModalManager.isShowing(VisiblePopup.AboutPane) },
						"🎒 About",
					),
					m(NavLink, { href: "/docs/" }, ["Docs", m(Icons.ExternalLink)]),
					m(
						NavLink,
						{ href: "https://github.com/sharat87/prestige/issues/new" },
						["Report a problem", m(Icons.ExternalLink)],
					),
					m(
						NavLink,
						{ href: "https://github.com/sharat87/prestige" },
						["Star on GitHub", m(Icons.ExternalLink)],
					),
				]),
			]),
			m(Sidebar, { workspace }),
			// The order of the below is a bit unintuitive, but is needed.
			// Firstly, the parent element of these two, is a grid container. So layout can be different from order.
			// Secondly, we need editor's layout to change, depending on result-pane's existence. So, we need these two
			// ... to be next to each other in this order, so that a `+` selector works for layout change.
			m(ResultPane, { workspace }),
			m(EditorPane, { workspace }),
			m("style", "body { --monospace-font: '" + editorFontOption() + "'; --monospace-font-size: " +
				editorFontSizeOption() + "px; }"),
		])
	}

	function onAboutPaneToggle() {
		ModalManager.toggleDrawer(
			() => m(ModalManager.DrawerLayout, { title: "About" }, m(AboutModal)),
			VisiblePopup.AboutPane,
		)
	}

	function onCookiesToggle() {
		ModalManager.toggleDrawer(
			() => m(CookiesModal, { cookieJar: workspace.cookieJar, workspace }),
			VisiblePopup.Cookies,
		)
	}

	function onFileBucketToggle() {
		ModalManager.toggleDrawer(
			() => m(FileBucketModal, { fileBucket: workspace.fileBucket }),
			VisiblePopup.FileBucketPopup,
		)
	}

	function onLoginFormToggle() {
		ModalManager.toggleDrawer(() => m(LoginFormModal), VisiblePopup.LoginForm)
	}

	function onOptionsToggle() {
		ModalManager.toggleDrawer(() => m(OptionsModal), VisiblePopup.Options)
	}

	function onColorPaletteToggle() {
		ModalManager.toggleDrawer(() => m(ColorPaletteModal), VisiblePopup.ColorPalette)
	}
}

class Sidebar implements m.ClassComponent {
	isOpen: boolean

	constructor() {
		this.isOpen = true
	}

	view() {
		return m("aside.sidebar.flex", [
			m(".tab-bar", [
				m(NavLink, { isActive: this.isOpen, onclick: this.toggleOpen.bind(this) }, "📝"),
			]),
			this.isOpen && m(".content", [
				m(DocumentBrowser),
			]),
		])
	}

	toggleOpen() {
		this.isOpen = !this.isOpen
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
		return m(".editor-pane", [
			m(Toolbar, {
				left: m(".flex", [
					m(
						NavLink,
						{
							onclick: () => {
								alert("Work in progress")
							},
						},
						"Create a Gist",
					),
				]),
			}),
			m(".body", {
				onclick(event: Event) {
					if ((event.target as HTMLElement).matches("span.cm-link")) {
						window.open((event.target as HTMLElement).innerText, "_blank", "noopener")
					}
				},
			}),
		])
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
