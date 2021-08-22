import m from "mithril"
import { currentProviders, Provider, Source } from "_/Persistence"
import Button from "_/Button"

export default { view }

function view(): m.Children {
	const providers: Provider<Source>[] = currentProviders()
	console.log("All providers", providers)

	return [
		m("h2.ma2", "Documents"),
		providers.length === 0 ? "None yet" : providers.map(renderProvider),
		m("p.ma2", "Integrations with more storage providers like GitHub and Dropbox coming soon."),
	]
}

function renderProvider(provider: Provider<Source>) {
	return m("details.ma2", { open: true }, [
		m("summary.pointer", provider.source.title),
		m(
			"a.pv1.ph2.db",
			{
				onclick,
				href: "#",
			},
			"+ Create new",
		),
		m("ul", [
			provider.entries.map(entry => m(
				"li",
				[
					m(
						m.route.Link,
						{
							class: "pv1 ph2 dib",
							href: `/doc/${ provider.key }/${ entry.path }`,
						},
						entry.name,
					),
					m(
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
					),
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
