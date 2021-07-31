import m from "mithril"
import { Context } from "../scripts/Context"

export function render(
	component: m.ComponentTypes,
	attrs: Record<string, unknown> = {},
	children: m.Children = "",
): Element {
	const root = document.createElement("div")
	m.mount(root, { view: () => m(component, attrs, children) })
	return root
}

export function makeMockContext(): Context {
	return {
		data: {},
		run: jest.fn(),
		on: jest.fn(),
		off: jest.fn(),
		emit: jest.fn(),
		basicAuth: jest.fn(),
		multipart: jest.fn(),
		fileFromBucket: jest.fn(),
		getProxyUrl: null,
		toast: jest.fn(),
	}
}
