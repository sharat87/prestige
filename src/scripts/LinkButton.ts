import m, { VnodeDOM } from "mithril";

export const LinkButton: m.Component<{ class?: string, href?: string, isActive?: boolean, onclick? }> = { view };

function view(vnode: VnodeDOM<{ class?: string, href?: string, isActive?: boolean, onclick? }>): m.Vnode {
	const href = vnode.attrs.href;

	const isButton = href == null || href === "#" || href === "";
	const attrs = isButton ? {
		type: "button",
	}: {
		href: vnode.attrs.href,
		target: "_blank",  // TODO: Set this to _blank *only* for external links.
	};

	return m(
		isButton ? "button" : "a",
		{
			class: (vnode.attrs.class || "") + " button " + (vnode.attrs.isActive ? " is-active" : ""),
			onclick: vnode.attrs.onclick,
			...attrs,
		},
		vnode.children,
	);
}
