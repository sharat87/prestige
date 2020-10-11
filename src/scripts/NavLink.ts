import m, { VnodeDOM } from "mithril";

export const NavLink = {
    view(vnode: VnodeDOM<{ class?: string, type?: string, href?: string, isActive?: boolean, onclick?: ((event: MouseEvent) => void) }>) {
        const tag = (vnode.attrs.href ? "a.link" : "button.bn.bg-transparent") +
            (vnode.attrs.isActive ? ".washed-blue.bg-blue" : ".color-inherit.hover-bg-washed-blue.hover-dark-blue") +
            ".pv1.ph2.pointer.flex.items-center";

        return m(
            tag,
            {
                class: vnode.attrs.class || "",
                ...(vnode.attrs.href ? {
                    href: vnode.attrs.href,
                    target: "_blank"
                } : { type: vnode.attrs.type || "button" }),
                onclick: vnode.attrs.onclick,
            },
            vnode.children,
        );
    }
}
