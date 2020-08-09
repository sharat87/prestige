import m from "mithril";

export const NothingMessage: m.Component<{ message?: string, extraMessage?: string }> = {
	view(vnode) {
		let message = vnode.attrs.message || "Nothing to show here.";
		if (vnode.attrs.extraMessage) {
			message += " " + vnode.attrs.extraMessage;
		}
		return m("p", m("em", message));
	},
};
