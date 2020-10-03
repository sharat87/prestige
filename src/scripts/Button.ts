import m from "mithril";

export default {
	view,
};

function view(vnode) {
	return m(
		"button.button",
		{
			class: (vnode.attrs.isPrimary ? "is-primary" : "") + (vnode.attrs.class || ""),
			type: vnode.attrs.type || "button",
			onclick: vnode.attrs.onclick,
		},
		vnode.children,
	);
}
