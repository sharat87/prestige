import m from "mithril"

const IconSVG = {
	view(vnode: m.VnodeDOM): m.Children {
		return m("svg.icon", { width: "1rem", height: "1rem", viewBox: "0 0 24 24" }, vnode.children)
	},
}

export const ChevronDown = {
	view: (): m.Children => m(IconSVG, [
		m("path", { d: "M 3 10 l 18 0 l -9 8 z", fill: "currentColor", stroke: "none" }),
	]),
}

export const ExternalLink = {
	view: (): m.Children => m(IconSVG, [
		m("path", { d: "M 9 9 l -6 0 l 0 12 l 12 0 l 0 -6 ", fill: "none", stroke: "currentColor", "stroke-width": 2 }),
		m("path", { d: "M 9 15 l 9 -9", fill: "none", stroke: "currentColor", "stroke-width": 2 }),
		m("path", { d: "M 12 3 l 9 0 l 0 9 Z", fill: "currentColor", stroke: "none" }),
	]),
}
