import m from "mithril";
import { getAllAvailableProviders, getSheet, Provider, Source } from "./Persistence";
import Button from "./Button";

export function DocumentBrowser(): m.Component {
	return { view };

	function view() {
		const providers: Provider<Source>[] = getAllAvailableProviders();
		console.log("All providers", providers);

		return [
			providers.map(renderProvider),
			m("p", [
				"Connect more endpoints: ",
				m(Button, "GitHub Repo"),
				m(Button, "Dropbox"),
				m(Button, "Google Drive"),
			]),
		];
	}
}

function renderProvider(provider: Provider<Source>) {
	return m("details", { open: true }, [
		m("summary", provider.source.title),
		provider.entries.map(entry => {
			return m("a.pv1.ph2.db.hover-bg-washed-blue.dark-blue", { onclick: onSheetClicked }, entry);
		}),
	]);
}

function onSheetClicked(event: MouseEvent) {
	getSheet("local/master")
		.then(sheet => console.log(sheet))
		.catch(error => console.log(error));
}
