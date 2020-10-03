import m from "mithril";
import { getAllAvailableProviders } from "./Persistence";
import Button from "./Button";

export function DocumentBrowser(): m.Component {
    return { view };

    function view() {
		const providers = getAllAvailableProviders();
		console.log("All providers", providers);

        return [
        	providers.map(provider => {
        		return m("details", { open: true }, [
					m("summary", provider.source.title),
					JSON.stringify(provider.entries),
				]);
			}),
			m("p", [
				"Connect more endpoints: ",
				m(Button, "GitHub Repo"),
				m(Button, "Dropbox"),
				m(Button, "Google Drive"),
			]),
		];
    }
}
