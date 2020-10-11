import m, { VnodeDOM } from "mithril";

export const Toolbar = {
    view: (vnode: VnodeDOM<{ left?: any, right?: any, peripherals?: any }>) => m(".toolbar", (vnode.attrs.left || vnode.attrs.right) && [
        m(".bar", [
            m(".left", vnode.attrs.left),
            m(".right", vnode.attrs.right),
        ]),
        // TODO: Can we use `vnode.children` instead of `vnode.attrs.peripherals`?
        m(".peripherals", vnode.attrs.peripherals),
    ]),
};
