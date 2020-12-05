import m from "mithril"
import Modal from "./Modal"
import Button from "./Button"

const OptionNames = {
	Proxy: "proxy",
	DisplayMode: "displayMode",
}

const PREFIX = "option:"

function get(name: string): any {
	const rawValue = localStorage.getItem(PREFIX + name)
	try {
		return rawValue != null ? JSON.parse(rawValue) : null
	} catch (error: any) {
		localStorage.removeItem(PREFIX + name)
		return null
	}
}

function set(name: string, value: any): void {
	const valueString: string = JSON.stringify(value)

	if (valueString === get(name)) {
		return
	}

	localStorage.setItem(PREFIX + name, valueString)
}

export default function OptionsModal(): m.Component<{ doClose: () => void}> {
	return { view }

	function view(vnode: m.VnodeDOM<{ doClose: () => void}>) {
		const displayMode = get(OptionNames.DisplayMode) ?? "system"
		return m(
			Modal,
			{
				title: "Options",
				footer: m(Button, { style: "primary", onclick: vnode.attrs.doClose }, "Close"),
			},
			m("form.grid", { onchange: onChange }, [
				m(".b", "Dark Mode (WIP)"),
				m(".flex", [
					m("label.flex", { title: "Sync to system's dark mode setting." }, [
						m("input", {
							type: "radio",
							name: OptionNames.DisplayMode,
							value: "system",
							checked: displayMode === "system",
						}),
						m(".ml1", "System"),
					]),
					m("label.flex.ml3", { title: "Always use light mode." }, [
						m("input", {
							type: "radio",
							name: OptionNames.DisplayMode,
							value: "light",
							checked: displayMode === "light",
						}),
						m(".ml1", "Light"),
					]),
					m("label.flex.ml3", { title: "Always use dark mode." }, [
						m("input", {
							type: "radio",
							name: OptionNames.DisplayMode,
							value: "dark",
							checked: displayMode === "dark",
						}),
						m(".ml1", "Dark"),
					]),
				]),
			]),
		)
	}

	function onChange(event: Event): void {
		if (event.target instanceof HTMLInputElement) {
			set(event.target.name, event.target.value)
		}
	}
}
