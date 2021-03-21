import m from "mithril"

interface Attrs {
	class?: string
	type?: string
	href?: string
	isActive?: boolean
	onclick?: ((event: MouseEvent) => void)
}

export const NavLink = {
	view(vnode: m.VnodeDOM<Attrs>): m.Children {
		return m(
			(vnode.attrs.href ? "a.link" : "button.bn.bg-transparent") + ".nav-link.pv1.ph2",
			{
				class: (vnode.attrs.isActive ? "active " : "") + vnode.attrs.class || "",
				...(vnode.attrs.href ? {
					href: vnode.attrs.href,
					target: "_blank",
				} : { type: vnode.attrs.type || "button" }),
				onclick: vnode.attrs.onclick,
			},
			vnode.children,
		)
	},
}
