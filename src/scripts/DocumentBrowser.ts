import m from "mithril";
import { LinkButton } from "./LinkButton";
import { getAllAvailableProviders } from "./Persistence";

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
				m(LinkButton, "GitHub Repo"),
				m(LinkButton, "Dropbox"),
				m(LinkButton, "Google Drive"),
			]),
		];
    }
}
