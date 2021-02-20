import m from "mithril"
import type { VnodeDOM } from "mithril"

export const LoadingLabel = {
	view(vnode: VnodeDOM<{ class?: string }>): m.Children {
		return m("p.tc.f2.i.mv6.gray", { class: vnode.attrs.class }, m.trust("Loading&hellip;"))
	},
}
