import m from "mithril"

interface Attrs {
	tableClass?: string
	thead?: m.Children
	tfoot?: m.Children
}

const Table: m.Component<Attrs> = {
	view(vnode: m.VnodeDOM<Attrs>): m.Children {
		const haveRows = Array.isArray(vnode.children) ? vnode.children.length > 0 : vnode.children != null

		return haveRows && m(
			".mw-100.overflow-x-auto.relative.mh2",
			m(
				"table.collapse.mw-100",
				{
					class: vnode.attrs.tableClass,
					style: {
						minWidth: "100%",
					},
				},
				[
					vnode.attrs.thead != null && m("thead", vnode.attrs.thead),
					m("tbody", vnode.children),
					vnode.attrs.tfoot != null && m("tfoot", vnode.attrs.tfoot),
				],
			),
		)
	},
}

export default Table
