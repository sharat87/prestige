import m from "mithril"
import type { Vnode, VnodeDOM } from "mithril"

export default { view }

function view(vnode: VnodeDOM<{ href: string }>): Vnode {
	return m(
		"a",
		{
			href: vnode.attrs.href,
			target: "_blank",
			rel: "noopener",
		},
		vnode.children,
	)
}
