import m from "mithril"
import Stream from "mithril/stream"
import SecretsPack from "./model"

export default { view }

interface Attrs {
	model: Stream<string>
	model2: SecretsPack
}

function view(vnode: m.Vnode<Attrs>): m.Children {
	return [
		m("h2.pa2", "Env Secrets"),
		m(
			"p.pa1",
			[
				"Provide a JSON object with string keys and string values below, and it'll be available as ",
				m("code", "this.env"),
				".",
			],
		),
		m("label", [
			m("span.mr1", "Current Env"),
			m(
				"select",
				vnode.attrs.model2.getEnvNames().map((name) => {
					return m("option", { value: name }, name)
				}),
			),
		]),
		m("textarea.ma1", {
			rows: 10,
			value: vnode.attrs.model(),
			oninput: (event: InputEvent) => {
				vnode.attrs.model((event.target as HTMLTextAreaElement).value)
			},
		}),
	]
}
