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
		const tag = (vnode.attrs.href ? "a.link" : "button.bn.bg-transparent") +
			(vnode.attrs.isActive ? ".washed-blue.bg-blue" : ".color-inherit.hover-bg-washed-blue.hover-dark-blue") +
			".br0.pv1.ph2.pointer.flex.items-center"

		return m(
			tag,
			{
				class: vnode.attrs.class || "",
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
