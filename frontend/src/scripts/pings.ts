declare const goatcounter: {
	count: (event: Record<string, unknown>) => void
}

export function ping(name: string, title: string): void {
	if (typeof goatcounter === "object" && typeof goatcounter.count === "function") {
		goatcounter.count({ path: name, title, event: true })
	}
}

export function load(): void {
	const s = document.createElement("script")
	s.dataset.goatcounter = "https://prestigemad.goatcounter.com/count"
	s.src = "//gc.zgo.at/count.js"
	document.body.appendChild(s)
}
