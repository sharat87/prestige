declare const goatcounter: {
	count: (event: Record<string, unknown>) => void
}

export function ping(path: string, title: string): void {
	if (typeof goatcounter === "object" && typeof goatcounter.count === "function") {
		goatcounter.count({ path, title, event: true })
	}
}
