import m from "mithril";

enum Option {
	Proxy,
	DisplayMode,
}

const data: Map<Option, string> = new Map([
	[Option.Proxy, ""],
	[Option.DisplayMode, "system"],
]);

const watches: Map<Option, ((option: Option, value: string) => void)[]> = new Map();

export const get = data.get.bind(data);

export function watch(option: Option, fn) {
	const fns = watches.get(option) || [];
	if (!watches.has(option)) {
		watches.set(option, fns);
	}
	fns.push(fn);
}

function set(option: Option, value: string) {
	if (value === data.get(option)) {
		return;
	}

	data.set(option, value);

	for (const fn of watches.get(option) || []) {
		fn(option, value);
	}
}

export default function OptionsModal() {
	return { view };

	function view(vnode) {
		const displayMode = get(Option.DisplayMode);
		return [
			m(".modal", [
				m("header", m("h2", "Options (WIP, currently does nothing)")),
				m("section.form", [
					m("span", "Proxy"),
					m("div", [
						m("input", { type: "text", value: get(Option.Proxy) }),
					]),
					m("span", "Dark Mode"),
					m("div", [
						m("label", { title: "Sync to system's dark mode setting" }, [
							m("input", { type: "radio", name: "displayMode", value: "system", checked: displayMode === "system" }),
							m("span", "System"),
						]),
						m("label", [
							m("input", { type: "radio", name: "displayMode", value: "light", checked: displayMode === "light" }),
							m("span", "Light"),
						]),
						m("label", [
							m("input", { type: "radio", name: "displayMode", value: "dark", checked: displayMode === "dark" }),
							m("span", "Dark"),
						]),
					]),
				]),
				m("footer", [
					m("button.primary", { type: "button", onclick: doSave }, "Save"),
					m("button", { type: "button", onclick: vnode.attrs.doClose }, "Cancel"),
				]),
			]),
		];
	}

	function doSave(event) {
		// TODO: Implement setting, saving (and loading) options.
		console.warn("Saving options is WIP.");
	}
}
