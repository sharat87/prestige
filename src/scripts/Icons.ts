import m from "mithril";
import ExternalLinkSVG from "icons/external-link.svg";
import ChevronDownSvg from "icons/chevron-down.svg";

export const ChevronDown = ChevronDownSvg;
export const ChevronDownRaw = icon(
	m("path", {
		d: "M 5 3 L 9 10 L 13 3 Z",
	})
);

export const ExternalLink = ExternalLinkSVG;

export const ExternalLinkRaw = icon(
	m("line", {
		x1: 9,
		y1: 9,
		x2: 16,
		y2: 2,
		stroke: "var(--icon-fg, var(--fg))",
		"stroke-width": "2",
	}),
	m("path", {
		d: "M 12 2 l 4 0 l 0 4",
		stroke: "var(--icon-fg, var(--fg))",
		"stroke-width": "2",
		fill: "none",
	}),
	m("path", {
		d: "M 9 5 L 4 5 L 4 14 l 9 0 l 0 -5",
		stroke: "var(--icon-fg, var(--fg))",
		"stroke-width": "2",
		fill: "none",
	})
);

function icon(...args) {
	const attrs = {
		viewBox: "0 0 18 18",
		style: {
			fill: "var(--icon-fg, var(--fg))",
			stroke: "none",
		},
	};

	return {
		view: () => m("span.icon", m("svg", attrs, args))
	};
}
