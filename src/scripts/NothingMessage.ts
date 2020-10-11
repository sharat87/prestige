import m, { VnodeDOM } from "mithril";

export default { view };

function view(vnode: VnodeDOM<{ message?: string, extraMessage?: string }>) {
	return m("p.i", [
		vnode.attrs.message || "Nothing to show here.",
		vnode.attrs.extraMessage && " " + vnode.attrs.extraMessage,
	]);
}
