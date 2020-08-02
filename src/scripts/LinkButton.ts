import m from "mithril";

export const LinkButton = { view };

function view(vnode) {
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
			class: "link-button" + (vnode.attrs.isActive ? " active" : ""),
			onclick: vnode.attrs.onclick,
			...attrs,
		},
		vnode.children
	);
}
