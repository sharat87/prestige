import m, { VnodeDOM } from "mithril"

interface Attrs {
	style?: "primary";
	class?: string;
	type?: "button" | "submit";
	onclick?: any;
}

export default {
	view,
}

function view(vnode: VnodeDOM<Attrs>): m.Children {
	let scheme = ""

	if (vnode.attrs.style === "primary") {
		scheme = ".bg-blue.washed-blue"
	} else {
		scheme = ".bg-light-gray.black"
	}

	return m(
		"button.button.pointer.ph3.pv2.br2.bn.glow.o-90" + scheme,
		{
			class: vnode.attrs.class || "",
			type: vnode.attrs.type || "button",
			onclick: vnode.attrs.onclick,
		},
		vnode.children,
	)
}
