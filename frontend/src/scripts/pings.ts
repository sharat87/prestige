import { isDev } from "./Env"

declare const goatcounter: {
	count: (event: Record<string, unknown>) => void
}

export function ping(name: string, title: string): void {
	if (typeof goatcounter === "object" && typeof goatcounter.count === "function") {
		goatcounter.count({ path: name, title, event: true })
	}
}

export function load(): void {
	if (!isDev()) {
		// noinspection JSUnresolvedLibraryURL
		document.body.insertAdjacentHTML(
			"beforeend",
			`<script async data-website-id="7378a035-9235-43ef-98bd-bf5886295b91" defer src="//u.sharats.me/main.js"></script>`,
		)
	}
}
