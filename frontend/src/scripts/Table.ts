import m from "mithril"

export const Table = {
	view(vnode: m.VnodeDOM): m.Children {
		const haveRows = Array.isArray(vnode.children) ? vnode.children.length > 0 : vnode.children != null

		return haveRows && m(
			".mw-100.overflow-x-auto.relative.mh2",
			m("table.collapse.mono.mw-100", m("tbody", vnode.children)),
		)
	},
}