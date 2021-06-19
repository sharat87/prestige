import m from "mithril"
import * as Exporter from "./ExportRequests"
import CodeBlock from "./CodeBlock"
import type { RequestDetails } from "./Parser"
import Button from "./Button"
import { copyToClipboard, downloadText } from "./utils"

export default { view }

interface Attrs {
	request: null | RequestDetails,
}

function view(vnode: m.VnodeDOM<Attrs>): m.Children {
	const { request } = vnode.attrs

	if (request == null) {
		return m("p", "No request to export")
	}

	return [
		m(
			CodeBlock,
			{
				class: "ma3",
				elements: Exporter.exportToCurl(request, { singleLine: false }).toComponentChildren(),
			},
		),
		m("p.ma2", "This is known to work with standard configuration dash, bash and zsh shells."),
		m("p", [
			m(Button, {
				class: "ml3",
				onclick() {
					if (request != null) {
						copyToClipboard(Exporter.exportToCurl(request, { singleLine: true }).toPlainString())
					}
				},
			}, "Copy as one-line"),
			m(Button, {
				class: "ml3",
				onclick() {
					if (request != null) {
						copyToClipboard(Exporter.exportToCurl(request, { singleLine: false }).toPlainString())
					}
				},
			}, "Copy as multiline"),
			m(Button, {
				class: "ml3",
				onclick() {
					if (request != null) {
						downloadText(Exporter.exportToCurl(request, { singleLine: false }).toPlainString())
					}
				},
			}, "Download"),
		]),
	]
}
