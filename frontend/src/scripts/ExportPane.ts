import m from "mithril"
import * as Exporter from "./ExportRequests"
import CodeBlock from "./CodeBlock"
import type { RequestDetails } from "./Parser"
import Button from "./Button"
import { copyToClipboard, downloadText, showCopyGhost } from "./utils"
import type CookieJar from "./CookieJar"

export default { view }

interface Attrs {
	request: null | RequestDetails
	cookieJar: null | CookieJar
}

interface State {
	useLongFlags: boolean
	includeCookies: boolean
}

function view(vnode: m.VnodeDOM<Attrs, State>): m.Children {
	const { request, cookieJar } = vnode.attrs
	const { includeCookies, useLongFlags } = vnode.state

	if (request == null) {
		return m("p", "No request to export")
	}

	const exporter = new Exporter.Exporter(request, cookieJar)

	return [
		m("p.ma2", [
			m("label.mh2", [
				m("input", {
					type: "checkbox",
					checked: useLongFlags,
					onchange(event: Event) {
						vnode.state.useLongFlags = (event.target as HTMLInputElement).checked
					},
				}),
				m("span.ml1", "Use long options"),
			]),
			m("label.mh2", [
				m("input", {
					type: "checkbox",
					checked: includeCookies,
					onchange(event: Event) {
						vnode.state.includeCookies = (event.target as HTMLInputElement).checked
					},
				}),
				m("span.ml1", "Include Cookies"),
			]),
		]),
		request != null && m("p.ma2", [
			m(Button, {
				onclick(event) {
					if (request != null) {
						copyToClipboard(
							exporter.toCurl({ singleLine: true, includeCookies, useLongFlags }).toPlainString(),
						)
						showCopyGhost(event.target as HTMLButtonElement)
					}
				},
			}, "Copy as one-line"),
			m(Button, {
				class: "ml3",
				onclick(event) {
					if (request != null) {
						copyToClipboard(
							exporter.toCurl({ includeCookies, useLongFlags }).toPlainString(),
						)
						showCopyGhost(event.target as HTMLButtonElement)
					}
				},
			}, "Copy as multiline"),
			m(Button, {
				class: "ml3",
				onclick(event) {
					if (request != null) {
						downloadText(
							exporter.toCurl({ includeCookies, useLongFlags }).toPlainString(),
						)
						showCopyGhost(event.target as HTMLButtonElement)
					}
				},
			}, "Download"),
		]),
		m(
			CodeBlock,
			{
				class: "ma3",
				elements: exporter.toCurl({ includeCookies, useLongFlags }).toComponentChildren(),
			},
		),
	]
}
