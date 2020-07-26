import m from "mithril";

export const NothingMessage = {
    view(vnode) {
        return m("p", m("em", vnode.attrs.message || "Nothing to show here."));
    },
};
