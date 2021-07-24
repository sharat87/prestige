import m from "mithril"
import ModalManager from "_/ModalManager"

export default { view }

function view(): m.Children {
	return m(
		ModalManager.DrawerLayout,
		{
			title: "Color Palette",
		},
		[
			m(CakeRow, { prefix: "gray" }),
			m(CakeRow, { prefix: "primary" }),
			m(CakeRow, { prefix: "blue" }),
			m(CakeRow, { prefix: "green" }),
			m(CakeRow, { prefix: "yellow" }),
			m(CakeRow, { prefix: "red" }),
			m(CakeRow, { prefix: "extra" }),
		],
	)
}

function isVarAvailable(name: string): boolean {
	return getComputedStyle(document.documentElement).getPropertyValue("--" + name) !== ""
}

const CakeRow = {
	view(vnode: m.VnodeDOM<{ prefix: string }>) {
		const { prefix } = vnode.attrs
		return m("p.tc", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => m(Cake, { name: `${prefix}-${n}` })))
	},
}

const Cake = {
	view(vnode: m.VnodeDOM<{ name: string }>) {
		const { name } = vnode.attrs
		return m(
			"span.dib.w2.h2.ma1.br2",
			{
				title: name,
				style: {
					boxShadow: isVarAvailable(name) ? "inset 0 0 2px #0009" : "none",
					backgroundColor: "var(--" + name + ")",
				},
			},
		)
	},
}
