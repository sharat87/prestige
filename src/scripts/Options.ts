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

export function watch(option: Option, fn: (option: Option, value: string) => void): void {
	const fns = watches.get(option) || [];
	if (!watches.has(option)) {
		watches.set(option, fns);
	}
	fns.push(fn);
}

function set(option: Option, value: string): void {
	if (value === data.get(option)) {
		return;
	}

	data.set(option, value);

	for (const fn of watches.get(option) || []) {
		fn(option, value);
	}
}

export default function OptionsModal(): m.Component<{ doClose: () => void}> {
	return { view };

	function view(vnode: m.VnodeDOM<{ doClose: () => void}>) {
		const displayMode = get(Option.DisplayMode);
		return [
			m(".modal", [
				m("header", m("h2", "Options (WIP, currently does nothing)")),
				m("section.form", [
					m("span", "Dark Mode"),
					m("div", [
						m("label", { title: "Sync to system's dark mode setting" }, [
							m("input", {
								type: "radio",
								name: "displayMode",
								value: "system",
								checked: displayMode === "system",
							}),
							m("span", "System"),
						]),
						m("label", [
							m("input", {
								type: "radio",
								name: "displayMode",
								value: "light",
								checked: displayMode === "light",
							}),
							m("span", "Light"),
						]),
						m("label", [
							m("input", {
								type: "radio",
								name: "displayMode",
								value: "dark",
								checked: displayMode === "dark",
							}),
							m("span", "Dark"),
						]),
					]),
					m("span", "Toolbar Style"),
					m("div", [
						m("label", [
							m("input", { type: "radio", name: "toolbarStyle", value: "icons" }),
							m("span", "Icons"),
						]),
						m("label", [
							m("input", { type: "radio", name: "toolbarStyle", value: "text", checked: true }),
							m("span", "Text"),
						]),
						m("label", [
							m("input", { type: "radio", name: "toolbarStyle", value: "both" }),
							m("span", "Icons & Text"),
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

	function doSave(/* Event */): void {
		// TODO: Implement setting, saving (and loading) options.
		console.warn("Saving options is WIP.");
	}
}
