import m from "mithril"
import Modal from "./Modal"
import Button from "./Button"
import humanSizeDisplay from "./humanSizeDisplay"
import FileBucket from "./FileBucket"

export default { oninit, view }

interface Attrs {
	fileBucket: FileBucket
	onClose: (event: MouseEvent) => void
}

interface State {
	isDragging: boolean
}

function oninit(vnode: m.VnodeDOM<Attrs, State>): void {
	vnode.state.isDragging = false
}

function view(vnode: m.VnodeDOM<Attrs, State>): m.Children {
	const rows: m.Vnode[] = []

	let n = 1
	for (const file of vnode.attrs.fileBucket) {
		rows.push(m("tr", [
			m("td", n++),
			m("td", file.name),
			m("td", humanSizeDisplay(file.size)),
			m("td", [
				m(Button, "Rename"),
				m(Button, "Delete"),
			]),
		]))
	}

	return m("div", { ondragover, ondragleave, ondrop }, m(
		Modal,
		{
			title: "FileBucket",
			footer: [
				m("div"),
				m(Button, { style: "primary", onclick: vnode.attrs.onClose }, "Close"),
			],
		},
		[
			vnode.state.isDragging && m("div", "drag mask"),
			m(
				".mw-100.overflow-x-auto.relative.mh2",
				rows.length === 0 ? "Let's drop a file in this here bucket!" : m("table.collapse", [
					m("thead",
						m("tr", [
							m("th", "#"),
							m("th", "Name"),
							m("th", "Size"),
							m("th", "Actions"),
						]),
					),
					m("tbody", rows),
				]),
			),
		],
	))

	// This event fires continuously forcing Mithril to redraw repeatedly. Can we do something about it?
	function ondragover(event: DragEvent): void {
		vnode.state.isDragging = true
		event.preventDefault()
	}

	function ondragleave() {
		vnode.state.isDragging = false
		m.redraw()
	}

	function ondrop(event: DragEvent) {
		vnode.state.isDragging = false
		event.preventDefault()

		if (event.dataTransfer?.items) {
			for (const item of event.dataTransfer.items) {
				if (item.kind === "file") {
					const file = item.getAsFile()
					if (file != null) {
						vnode.attrs.fileBucket.set(file.name, file)
					}
				}
			}

		} else {
			// Use DataTransfer interface to access the file(s)
			// New interface handlign: vnode.state.files = event.dataTransfer.files

		}
		m.redraw()
	}

}
