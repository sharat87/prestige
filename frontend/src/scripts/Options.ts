import m from "mithril"
import Stream from "mithril/stream"
import Modal from "./Modal"
import Button from "./Button"

const PREFIX = "option:"

type DisplayMode = "auto" | "light" | "dark"

const displayModeOption: Stream<DisplayMode> = Stream()
const isPrefersDark: Stream<boolean> = Stream()

displayModeOption.map((value: DisplayMode) => {
	updateIsDark()
	// Following meta property changes color of native UI controls in Chrome. No Firefox support yet.
	const colorSchemeMeta = document.head.querySelector("meta[name=color-scheme]")
	if (colorSchemeMeta instanceof HTMLMetaElement) {  // Also does a null-check.
		colorSchemeMeta.content = value === "auto" ? "light dark" : value
	}
})
initOption(displayModeOption, "displayMode", "auto")

window.matchMedia("(prefers-color-scheme: dark)").addListener(event => {
	isPrefersDark(event.matches)
})
isPrefersDark.map(updateIsDark)

function updateIsDark() {
	const modeValue = displayModeOption()
	const isPrefersDarkValue = isPrefersDark()
	const isDark = modeValue === "auto" ? isPrefersDarkValue : (modeValue === "dark")
	document.body.classList[isDark ? "add" : "remove"]("dark")
}

const paletteOption: Stream<string> = Stream()
paletteOption.map((value: string) => {
	document.body.dataset.palette = value
})
initOption(paletteOption, "palette", "base16")

const editorFontOption: Stream<string> = Stream()
editorFontOption.map(m.redraw)
initOption(editorFontOption, "editorFont", "Source Code Pro")

const editorFontSizeOption: Stream<string> = Stream()
editorFontSizeOption.map(m.redraw)
initOption(editorFontSizeOption, "editorFontSize", "16")

export {
	editorFontOption,
	editorFontSizeOption,
}

function load<T>(name: string): null | T {
	const rawValue = localStorage.getItem(PREFIX + name)
	try {
		return rawValue != null ? JSON.parse(rawValue) : null
	} catch (error) {
		localStorage.removeItem(PREFIX + name)
		return null
	}
}

function save<T>(name: string, value: T): void {
	const valueString: string = JSON.stringify(value)

	if (valueString === load(name)) {
		return
	}

	localStorage.setItem(PREFIX + name, valueString)
}

function saver<T>(name: string): ((value: T) => void) {
	return (value: T) => save(name, value)
}

function initOption<T>(stream: Stream<T>, name: string, defaultValue: T): void {
	stream(load(name) ?? defaultValue)
	stream.map(saver<T>(name))
}

export default function OptionsModal(): m.Component<{ doClose: () => void}> {
	return { view }

	function view(vnode: m.VnodeDOM<{ doClose: () => void}>) {
		return m(
			Modal,
			{
				title: "Options",
				footer: [
					m("div"),
					m(Button, { style: "primary", onclick: vnode.attrs.doClose }, "Close"),
				],
			},
			m("form.grid", [
				m(".b", "Dark Mode"),
				m(".flex", [
					m("label.flex", { title: "Sync to system's dark mode setting." }, [
						m("input", {
							type: "radio",
							name: "displayMode",
							value: "auto",
							checked: displayModeOption() === "auto",
							onchange,
						}),
						m(".ml1", "System"),
					]),
					m("label.flex.ml3", { title: "Always use light mode." }, [
						m("input", {
							type: "radio",
							name: "displayMode",
							value: "light",
							checked: displayModeOption() === "light",
							onchange,
						}),
						m(".ml1", "Light"),
					]),
					m("label.flex.ml3", { title: "Always use dark mode." }, [
						m("input", {
							type: "radio",
							name: "displayMode",
							value: "dark",
							checked: displayModeOption() === "dark",
							onchange,
						}),
						m(".ml1", "Dark"),
					]),
				]),
				m(".b", "Color Scheme"),
				m(
					"select",
					{
						value: paletteOption(),
						onchange(event: Event) {
							paletteOption((event.target as HTMLInputElement).value)
						},
					},
					[
						m("option", { value: "base16" }, "Base 16"),
						m("option", { value: "mono" }, "Mono"),
						m("option", { value: "tomorrow" }, "Tomorrow"),
						m("option", { value: "solarized" }, "Solarized"),
					],
				),
				m(".b", "Editor Font"),
				m(
					"select",
					{
						value: editorFontOption(),
						onchange(event: Event) {
							editorFontOption((event.target as HTMLInputElement).value)
						},
					},
					[
						m("option", { value: "Source Code Pro" }, "Source Code Pro (Default)"),
						m("option", { value: "Consolas" }, "Consolas"),
						m("option", { value: "Monaco" }, "Monaco"),
					],
				),
				m(".b", "Editor Font Size"),
				m(
					"input",
					{
						type: "number",
						value: editorFontSizeOption(),
						oninput(event: Event) {
							editorFontSizeOption((event.target as HTMLInputElement).value)
						},
					},
				),
			]),
		)
	}

	function onchange(event: Event) {
		displayModeOption((event.target as HTMLInputElement).form?.displayMode.value)
	}
}
