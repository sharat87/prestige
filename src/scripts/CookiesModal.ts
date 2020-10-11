import m, { Vnode, VnodeDOM } from "mithril";
import Modal from "./Modal";
import Button from "./Button";
import CookieJar from "./CookieJar";

export default { view };

function view(vnode: VnodeDOM<{ cookieJar: CookieJar, onClose: any }>) {
	const rows: Vnode[] = [];
	let i = 0;

	for (const [domain, byPath] of Object.entries(vnode.attrs.cookieJar.store)) {
		for (const [path, byName] of Object.entries(byPath as any)) {
			for (const [name, morsel] of Object.entries(byName as any)) {
				rows.push(m("tr", [
					m("td", ++i),
					m("td", domain),
					m("td", path),
					m("td", name),
					m("td", (morsel as any).value),
					m("td", (morsel as any).expires),
					m("td", [
						m(
							Button,
							{
								class: "bg-washed-red dark-red hover-bg-dark-red hover-washed-red",
								// TODO: Cookie jar is not saved after deletion here.
								onclick: () => vnode.attrs.cookieJar.delete(`${domain}\t${path}\t${name}`),
							},
							"Del",
						),
					]),
				]));
			}
		}
	}

	return m(
		Modal,
		{
			title: "Cookies",
			footer: [
				vnode.attrs.cookieJar?.size > 0 ? m(
					Button,
					{ class: "hover-bg-dark-red hover-washed-red", onclick: () => vnode.attrs.cookieJar.clear() },
					"Clear all cookies",
				) : m("div"),
				m(Button, { style: "primary", onclick: vnode.attrs.onClose }, "Close"),
			],
		},
		[
			m(
				".mw-100.overflow-x-auto.relative.mh2",
				m("table.collapse", [
					m("thead",
						m("tr", [
							m("th", "#"),
							m("th", "Domain"),
							m("th", "Path"),
							m("th", "Name"),
							m("th", "Value"),
							m("th", "Expires"),
							m("th", "Actions"),
						]),
					),
					m("tbody", rows),
					/*
					M("tfoot",
						m("tr", [
							m("td", "+"),
							m("td", m("input")),
							m("td", m("input")),
							m("td", m("input")),
							m("td", m("input")),
							m("td", m("input")),
							m("td", m(
								Button,
								{ class: "bg-washed-green dark-green hover-bg-dark-green hover-washed-green" },
								"Add",
							)),
						])
					),
					 */
				]),
			),
			m("p.bg-washed-blue.dark-blue.ba.b--dark-blue.pa2.br2", "These cookies will be used for requests" +
				" executed by proxy only. For requests that are executed without a proxy, please refer to the browser" +
				" console. This is a browser-level security restriction."),
		],
	);
}
