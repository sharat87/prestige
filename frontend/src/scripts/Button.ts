import m, { VnodeDOM } from "mithril"

interface Attrs {
	style?: null | "primary"
	class?: string
	type?: "button" | "submit"
	onclick?: (event: Event) => void
	disabled?: boolean
	isLoading?: boolean
}

export default {
	view,
}

function view(vnode: VnodeDOM<Attrs>): m.Children {
	let scheme = ""

	if (vnode.attrs.style === "primary") {
		scheme = ".primary"
	}

	return m(
		"button" + scheme,
		{
			class: vnode.attrs.class || "",
			type: vnode.attrs.type || "button",
			onclick: vnode.attrs.onclick,
			disabled: vnode.attrs.disabled ?? vnode.attrs.isLoading ?? false,
		},
		vnode.children,
	)
}
