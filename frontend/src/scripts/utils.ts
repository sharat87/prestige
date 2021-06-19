export function isPromise(object: any): boolean {
	return object != null && typeof object.then === "function"
}

export function copyToClipboard(text: string): void {
	const el = document.createElement("textarea")
	el.style.position = "fixed"
	el.style.opacity = el.style.top = el.style.left = "0"
	el.style.pointerEvents = "none"
	document.body.append(el)
	el.value = text
	el.select()
	document.execCommand("copy")
	el.remove()
}

export function downloadText(text: string, filename = "file.txt"): void {
	const el = document.createElement("a")
	el.style.display = "none"
	el.setAttribute("download", filename)
	el.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text))
	document.body.append(el)
	el.click()
	el.remove()
}

export function repeat<A>(item: A, times: number): A[] {
	const result: A[] = []
	while (times-- > 0) {
		result.push(item)
	}
	return result
}
