import m from "mithril"

export default {
	view,
}

interface Attrs {
	class?: string
	type?: string
	href?: string
	title?: string
	isActive?: boolean
	tooltip?: string
	tooltipDir?: "right"
	disabled?: boolean
	onclick?: ((event: MouseEvent) => void)
}

function view(vnode: m.VnodeDOM<Attrs>): m.Children {
	return m(
		(vnode.attrs.href ? "a.link" : "button.bn.bg-transparent") + ".nav-link.pv1.ph2",
		{
			class: (vnode.attrs.isActive ? "active " : "") + (vnode.attrs.class ?? ""),
			...(
				vnode.attrs.href
					? { href: vnode.attrs.href, target: "_blank" }
					: { type: vnode.attrs.type || "button" }
			),
			title: vnode.attrs.title,
			disabled: vnode.attrs.disabled,
			onclick: vnode.attrs.onclick,
		},
		[
			vnode.children,
			vnode.attrs.tooltip != null && m("span.tip", { class: vnode.attrs.tooltipDir }, vnode.attrs.tooltip),
		],
	)
}
