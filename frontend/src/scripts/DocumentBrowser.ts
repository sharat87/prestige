import m from "mithril"
import { currentProviders, Provider, Source } from "./Persistence"

export function DocumentBrowser(): m.Component {
	return { view }

	function view() {
		const providers: Provider<Source>[] = currentProviders()
		console.log("All providers", providers)

		return [
			providers.length === 0 ? "None yet" : providers.map(renderProvider),
			m("p", "Integrations with more storage providers coming soon."),
		]
	}
}

function renderProvider(provider: Provider<Source>) {
	return m("details.mv2.pv1", { open: true }, [
		m("summary.pointer", provider.source.title),
		provider.entries.map(entry => {
			return m("div", [
				m(
					m.route.Link,
					{
						class: "pv1 ph2 dib hover-bg-washed-blue dark-blue",
						href: `/doc/${ provider.key }/${ entry.path }`,
					},
					entry.name,
				),
				m(
					"a.ml2.ph1.br-pill.no-underline.dark-red.hover-washed-red.hover-bg-dark-red",
					{
						href: "#",
						onclick(event: Event) {
							console.log("Deleting", entry)
							provider.delete(entry.path)
							event.preventDefault()
						},
					},
					m.trust("&times;"),
				),
			])
		}),
		m(
			"a.pv1.ph2.db.hover-bg-washed-blue.dark-blue",
			{
				onclick,
				href: "#",
			},
			"+ New Sheet",
		),
	])

	function onclick(event: MouseEvent) {
		event.preventDefault()
		const name = prompt("Sheet Name")
		if (name != null) {
			provider.create("", name)
		}
	}

}
