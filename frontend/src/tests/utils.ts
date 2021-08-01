import m from "mithril"

export function render(
	component: m.ComponentTypes,
	attrs: Record<string, unknown> = {},
	children: m.Children = "",
): Element {
	const root = document.createElement("div")
	m.mount(root, { view: () => m(component, attrs, children) })
	return root
}
