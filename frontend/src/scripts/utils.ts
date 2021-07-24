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

export function showCopyGhost(el: Element): void {
	const rect = el.getBoundingClientRect()
	const ghost = document.createElement("div")
	ghost.innerText = "Copied!"
	ghost.style.position = "fixed"
	ghost.style.left = rect.x + "px"
	ghost.style.top = rect.y + "px"
	ghost.style.width = rect.width + "px"
	ghost.style.height = rect.height + "px"
	ghost.style.fontWeight = "bold"
	ghost.style.fontSize = "1.2em"
	ghost.style.zIndex = "500"
	ghost.style.display = "flex"
	ghost.style.justifyContent = ghost.style.alignItems = "center"
	ghost.style.cursor = "default"
	ghost.style.pointerEvents = "none"
	ghost.style.animation = "ghost 2s ease-out"
	ghost.addEventListener("animationend", ghost.remove.bind(ghost))
	document.body.appendChild(ghost)
}
