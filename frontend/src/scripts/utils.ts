export function isPromise(object: unknown): object is Promise<unknown> {
	return object != null && typeof (object as Promise<unknown>).then === "function"
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

export function showGhost(el: Element, text = "Copied!"): void {
	const rect = el.getBoundingClientRect()
	const ghost = document.createElement("div")
	ghost.innerText = text
	ghost.style.position = "fixed"
	ghost.style.left = rect.x + "px"
	ghost.style.top = rect.y + "px"
	ghost.style.minWidth = rect.width + "px"
	ghost.style.height = rect.height + "px"
	ghost.style.fontWeight = "bold"
	ghost.style.zIndex = "500"
	ghost.style.display = "flex"
	ghost.style.justifyContent = ghost.style.alignItems = "center"
	ghost.style.cursor = "default"
	ghost.style.pointerEvents = "none"
	ghost.style.animation = "ghost 1s ease-out"
	ghost.style.pageBreakInside = "avoid"
	ghost.addEventListener("animationend", ghost.remove.bind(ghost))
	document.body.appendChild(ghost)
}

export function encodeBase64(text: string): string {
	// Vanilla `btoa` cannot handle unicode characters in strings.
	// So we need this dance so unicode characters don't break the encoding process.
	// Ref: <https://developer.mozilla.org/en-US/docs/Glossary/Base64>
	return btoa(unescape(encodeURIComponent(text)))
}
