import m from "mithril"
import { currentProviders, Provider, Source } from "_/Persistence"
import Button from "_/Button"

export default { oncreate, view }

interface State {
	selection: Set<string>
}

function oncreate(vnode: m.Vnode<never, State>): void {
	vnode.state.selection = new Set
}

function view(): m.Children {
	const providers: Provider<Source>[] = currentProviders()
	console.log("All providers", providers)

	return [
		m("h2.ma2", "Documents"),
		providers.length === 0 ? "None yet" : providers.map((provider: Provider<Source>) => {
			return provider.listingUi != null ? provider.listingUi() : m("details.provider-block", { open: true }, [
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
					provider.entries.map(entry => {
						const href = `/doc/${ provider.key }/${ entry.path }`
						return m(
							"li",
							[
								m(
									m.route.Link,
									{
										href,
										class: window.location.hash.substr(2) === href ? "active" : "",
									},
									entry.name,
								),
								/*
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
							   //*/
							],
						)
					}),
				]),
			])

			function onclick(event: MouseEvent) {
				event.preventDefault()
				const name = prompt("Sheet Name")
				if (name != null) {
					provider.create("", name)
				}
			}

		}),
		// TODO: Show a message here to connect to GitHub for Gist integration, if not already done.
	]
}
