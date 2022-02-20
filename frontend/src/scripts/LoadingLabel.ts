import m from "mithril"
import * as Icons from "_/Icons"

export default { view }

interface Attrs {
	class?: string
}

function view(vnode: m.Vnode<Attrs>): m.Children {
	return m("p.tc.f2.i.mv6.gray", { class: vnode.attrs.class }, [
		m(Icons.spinner, { style: "bold" }),
		m.trust("Loading&hellip;"),
	])
}
