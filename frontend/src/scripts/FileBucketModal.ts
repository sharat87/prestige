import m from "mithril"
import Modal from "./Modal"
import Button from "./Button"
import humanSizeDisplay from "./humanSizeDisplay"
import FileBucket from "./FileBucket"
import Table from "./Table"

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
			rows.length === 0 ? "Let's drop a file in this here bucket!" : m(
				Table,
				{
					thead: m("tr", [
						m("th", "#"),
						m("th", "Name"),
						m("th", "Size"),
					]),
				},
				rows,
			),
			vnode.state.isDragging && m(
				".aspect-ratio--object.f2.tc.pt5",
				{ style: { backgroundColor: "#EEEC" } },
				"Drop here to add to the file bucket!",
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
