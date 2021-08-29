import m from "mithril"
import Modal from "_/Modal"
import Button from "_/Button"

type ViewFn = (control: ModalControl) => m.Children
let currentViewFn: null | ViewFn = null

type KeyType = unknown
let currentKey: KeyType = null

interface DrawerOptions {
	title?: string
	vcenter?: boolean
	footerLeft?: m.Children
}

class ModalControl {
	key: number

	constructor() {
		this.key = Date.now()
	}

	close() {
		if (currentKey === this.key) {
			close()
		}
	}
}

function show(viewFn: ViewFn): void {
	const control = new ModalControl()
	currentViewFn = () => m(ModalLayout, viewFn(control))
	currentKey = control.key
	m.redraw()
}

function toggleDrawer(viewFn: ViewFn, key: KeyType): void {
	if (isShowing(key)) {
		close()
	} else {
		currentViewFn = viewFn
		currentKey = key
	}
	m.redraw()
}

function isShowing(key: KeyType): boolean {
	return currentKey === key
}

function close(): void {
	currentViewFn = currentKey = null
	m.redraw()
}

function render(): m.Children {
	return currentViewFn != null && currentViewFn()
}

const ModalLayout = {
	view(vnode: m.Vnode<unknown, unknown>): m.Children {
		return [
			m(".modal2-mask", { onclick: close }),
			m(
				".modal2",
				{
				},
				[
					vnode.children,
					m(
						"button.absolute.top-1.right-1.danger-light.ph2.pv0.br-100.f3",
						{ onclick: close },
						m.trust("&times;"),
					),
				],
			),
		]
	},
}

const DrawerLayout = {
	view(vnode: m.Vnode<DrawerOptions, unknown>): m.Children {
		return m(
			Modal,
			{
				title: vnode.attrs.title,
				vcenter: vnode.attrs.vcenter,
				footer: [
					vnode.attrs.footerLeft ?? m("div"),
					m(
						"div",
						m(Button, { style: "primary", type: "button", onclick: close }, "Close"),
					),
				],
			},
			vnode.children,
		)
	},
}

export default { show, toggleDrawer, isShowing, close, render, DrawerLayout }
