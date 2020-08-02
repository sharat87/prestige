import m from "mithril";

// export const ChevronDown = icon("▼");

export const ChevronDown = icon(
	m("path", {
		d: "M 3 3 L 9 12 L 15 3",
		fill: "none",
		stroke: "black",
		"stroke-width": "2",
	})
);

function icon(...args) {
	return {
		view() {
			return m("span.icon", m("svg", { width: "18px", height: "18px" }, ...args));
		}
	};
}
