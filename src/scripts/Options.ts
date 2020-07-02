import m from "mithril";

const data: {
	proxy: string,
	displayMode: "system" | "light" | "dark" | "timed",
} = {
	proxy: "",
	displayMode: "system",
};

export default function OptionsModal() {
	return { view };

	function view(vnode) {
		return [
			// m("div.mask"),
			m("div.modal", [
				m("header", m("h2", "Options (WIP, currently does nothing)")),
				m("section.form", [
					m("span", "Proxy"),
					m("div", [
						m("input", { type: "text", value: data.proxy }),
					]),
					m("span", "Dark Mode"),
					m("div", [
						m("label", { title: "Sync to system's dark mode setting" }, [
							m("input", { type: "radio", name: "darkMode", value: "system", checked: data.displayMode === "system" }),
							m("span", "System"),
						]),
						m("label", [
							m("input", { type: "radio", name: "darkMode", value: "light" }),
							m("span", "Light"),
						]),
						m("label", [
							m("input", { type: "radio", name: "darkMode", value: "dark" }),
							m("span", "Dark"),
						]),
					]),
				]),
				m("footer", [
					m("button.primary", { type: "button", onclick: vnode.attrs.doSave }, "Save"),
					m("button", { type: "button", onclick: vnode.attrs.doClose }, "Cancel"),
				]),
			]),
		];
	}
}
