import m from "mithril"
import { currentProviders, Provider, Source } from "./Persistence"
import Button from "./Button"

export function DocumentBrowser(): m.Component {
	return { view }

	function view() {
		const providers: Provider<Source>[] = currentProviders()
		console.log("All providers", providers)

		return [
			providers.length === 0 ? "None yet" : providers.map(p => p.source.title),
			m("p", [
				"Connect more endpoints: ",
				m(Button, "GitHub Repo"),
				m(Button, "Dropbox"),
				m(Button, "Google Drive"),
			]),
		]
	}
}

function renderProvider(provider: Provider<Source>) {
	return m("details.mv2.pv1", { open: true }, [
		m("summary.pointer", [
			provider.source.title,
		]),
		provider.entries.map(entry => {
			return m(
				"a.pv1.ph2.db.hover-bg-washed-blue.dark-blue",
				{
					href: `#/doc/${ provider.key }/${ entry.path }`,
				},
				entry.name,
			)
		}),
		m(
			"a.pv1.ph2.db.hover-bg-washed-blue.dark-blue",
			{
				onclick: onNewClicked,
				href: "#",
			},
			"+ New Sheet",
		),
	])
}

function onNewClicked(event: MouseEvent) {
	event.preventDefault()
	const name = prompt("Sheet Name")
	console.log("Create sheet", name)
}
