import m from "mithril"
import { currentProviders, Provider, Source } from "_/Persistence"
import Table from "_/Table"
import Button from "_/Button"
import ModalManager from "_/ModalManager"

export function DocumentBrowser(): m.Component {
	return { view }

	function view() {
		const providers: Provider<Source>[] = currentProviders()
		console.log("All providers", providers)

		return m(
			ModalManager.DrawerLayout,
			{
				title: "Documents",
			},
			[
				providers.length === 0 ? "None yet" : providers.map(renderProvider),
				m("p", "Integrations with more storage providers like GitHub and Dropbox coming soon."),
			],
		)
	}
}

function renderProvider(provider: Provider<Source>) {
	return m("details.mv2.pv1", { open: true }, [
		m("summary.pointer", provider.source.title),
		m(
			"a.pv1.ph2.db",
			{
				onclick,
				href: "#",
			},
			"+ New Sheet",
		),
		m(Table, [
			provider.entries.map(entry => m(
				"tr",
				[
					m("td", m(
						m.route.Link,
						{
							class: "pv1 ph2 dib",
							href: `/doc/${ provider.key }/${ entry.path }`,
						},
						entry.name,
					)),
					m("td", m(
						Button,
						{
							class: "compact danger-light",
							onclick(event: Event) {
								console.log("Deleting", entry)
								provider.delete(entry.path)
								event.preventDefault()
							},
						},
						"Del",
					)),
				],
			)),
		]),
	])

	function onclick(event: MouseEvent) {
		event.preventDefault()
		const name = prompt("Sheet Name")
		if (name != null) {
			provider.create("", name)
		}
	}

}
