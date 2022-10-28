declare const goatcounter: {
	count: (event: Record<string, unknown>) => void
}

export function ping(name: string, title: string): void {
	if (typeof goatcounter === "object" && typeof goatcounter.count === "function") {
		goatcounter.count({ path: name, title, event: true })
	}
}
