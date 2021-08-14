import m from "mithril"
import type { Vnode, VnodeDOM } from "mithril"
import PageEnd from "_/PageEnd"

export default { view }

function view(vnode: VnodeDOM<{ title?: string, vcenter?: boolean, footer?: m.Children }>): Vnode {
	return m(".modal.fixed.right-0.w-50.vh-75.flex.flex-column", [
		vnode.attrs.title != null && m("header.pa2", [
			m("h2.ma0", vnode.attrs.title || "Excuse the interruption"),
		]),
		m("section.pa2.overflow-y-auto" + (vnode.attrs.vcenter ? ".flex.flex-column.justify-center" : ""), [
			vnode.children,
			m(PageEnd),
		]),
		vnode.attrs.footer != null && m("footer.pa2.flex.justify-between", vnode.attrs.footer),
	])
}
