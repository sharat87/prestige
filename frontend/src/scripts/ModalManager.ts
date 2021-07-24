import m from "mithril"
import Modal from "_/Modal"
import Button from "_/Button"

let currentComponent: null | m.Vnode<unknown, unknown> = null

type KeyType = unknown
let currentKey: KeyType = null

interface DrawerOptions {
	title: string
	footerLeft?: m.Children
}

function show(component: m.Vnode<unknown, unknown>): void {
	currentComponent = m(ModalLayout, component)
	m.redraw()
}

function toggleDrawer(component: m.Vnode<unknown, unknown>, key: KeyType): void {
	if (isShowing(key)) {
		close()
	} else {
		currentComponent = component
		currentKey = key
	}
	m.redraw()
}

function isShowing(key: KeyType): boolean {
	return currentKey === key
}

function close(): void {
	currentComponent = currentKey = null
	m.redraw()
}

function render(): m.Children {
	return currentComponent != null && currentComponent
}

const ModalLayout = {
	view(vnode: m.Vnode<unknown, unknown>): m.Children {
		return [
			m(".modal2-mask", { onclick: close }),
			m(".modal2", [
				vnode.children,
				m(
					"button.absolute.top-1.right-1.danger-light.ph2.pv0.br-100.f3",
					{ onclick: close },
					m.trust("&times;"),
				),
			]),
		]
	},
}

const DrawerLayout = {
	view(vnode: m.Vnode<DrawerOptions, unknown>): m.Children {
		return m(
			Modal,
			{
				title: vnode.attrs.title,
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
