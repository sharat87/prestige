import type { Children, VnodeDOM } from "mithril"
import m from "mithril"

interface Attrs {
	left?: Children;
	right?: Children;
	peripherals?: Children;
}

export default {
	view: (vnode: VnodeDOM<Attrs>): m.Children => m(".toolbar", (vnode.attrs.left || vnode.attrs.right) && [
		m(".bar", [
			m(".left", vnode.attrs.left),
			m(".right", vnode.attrs.right),
		]),
		// TODO: Can we use `vnode.children` instead of `vnode.attrs.peripherals`?
		m(".peripherals", vnode.attrs.peripherals),
	]),
}
