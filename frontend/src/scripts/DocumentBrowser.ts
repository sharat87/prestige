import m from "mithril"
import { currentProviders, Provider, Source } from "_/Persistence"

export default { view }

function view(): m.Children {
	const providers: Provider<Source>[] = currentProviders()

	return [
		m("h2.ma2", "Documents"),
		providers.length === 0 ? "None yet" :
			providers.map((provider: Provider<Source>) => m("details.provider-block", { open: true }, [
				m("summary.pointer", provider.source.title),
				provider.render(),
			])),
	]
}
