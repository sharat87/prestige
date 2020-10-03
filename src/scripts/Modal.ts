import m from "mithril";
import { PageEnd } from "./PageEnd";

export const Modal = {
    view: vnode => m(".modal.fixed.right-0.flex.flex-column.bt.b--blue.bg-white", [
		m("header", [
			m("h2", vnode.attrs.title || "Excuse the interruption"),
		]),
		m("section", [
			vnode.children,
			m(PageEnd),
		]),
		vnode.attrs.footer && m("footer", vnode.attrs.footer),
    ]),
};
