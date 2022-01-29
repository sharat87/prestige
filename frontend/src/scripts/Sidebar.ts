import m from "mithril"
import NavLink from "_/NavLink"
import DocumentBrowser from "_/DocumentBrowser"
import PageEnd from "_/PageEnd"
import OptionsModal from "_/Options"
import EnvSecretsView from "_/secrets/view"
import type Workspace from "_/Workspace"
import { isDev } from "_/Env"
import * as Icons from "_/Icons"

type PaneType = "d" | "o" | "e"

interface Attrs {
	workspace: Workspace
}

export default function Sidebar(): m.Component<Attrs> {
	let currentPane: null | PaneType = null
	let currentWidth = 240
	let dragStartWidth: number = currentWidth
	let dragStartClientX = 0

	return { view }

	function view(vnode: m.Vnode<Attrs>): m.Children {
		return m("aside.sidebar.flex", [
			m(".tab-bar", [
				tabLink("Documents", "d", Icons.files),
				isDev() && tabLink("Env Secrets", "e", Icons.key),
				tabLink("Options", "o", Icons.gear),
			]),
			currentPane != null && [
				m(".content", { style: { width: `${currentWidth}px` } }, [
					currentPane === "d" && m(DocumentBrowser),
					currentPane === "o" && m(OptionsModal),
					currentPane === "e" && m(
						EnvSecretsView,
						{
							model: vnode.attrs.workspace.secretsObject,
							model2: vnode.attrs.workspace.secrets,
						},
					),
					m(PageEnd),
				]),
				isDev() && m(".grip", {
					title: "Resize the sidebar",
					onmousedown: onMouseDown,
				}),
			],
		])
	}

	function tabLink(tooltip: string, pane: PaneType, icon: m.Component): m.Children {
		return m(
			NavLink,
			{
				tooltip,
				tooltipDir: "right",
				isActive: currentPane === pane,
				onclick() {
					currentPane = currentPane === pane ? null : pane
				},
			},
			m(icon),
		)
	}

	function onMouseDown(event: MouseEvent): void {
		// The actual width may be different from the `currentWidth` due to CSS based limits like `max-width`.
		dragStartWidth =
			(event.target as HTMLDivElement)?.parentElement?.querySelector<HTMLElement>(".content")?.offsetWidth
				?? currentWidth
		dragStartClientX = event.clientX
		// Disable text selection so that text doesn't get randomly selected while dragging the resize grip.
		document.body.style.userSelect = "none"
		document.body.style.cursor = "ew-resize"
		document.body.addEventListener("mousemove", onBodyMouseMove)
		document.body.addEventListener("mouseup", onBodyMouseUp)
	}

	function onBodyMouseMove(event: MouseEvent): void {
		currentWidth = dragStartWidth + event.clientX - dragStartClientX
		// Call redraw manually here since this event handler is not bound by Mithril.
		m.redraw()
	}

	function onBodyMouseUp(): void {
		document.body.style.userSelect = document.body.style.cursor = ""
		document.body.removeEventListener("mousemove", onBodyMouseMove)
		document.body.removeEventListener("mouseup", onBodyMouseUp)
		// Call redraw manually here since this event handler is not bound by Mithril.
		m.redraw()
	}

}
