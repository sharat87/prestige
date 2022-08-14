import { Page } from "@playwright/test"

export async function setEditorText(page: Page, text: string): Promise<void> {
	await page.click(".CodeMirror")
	await page.press(".CodeMirror", process.platform === "darwin" ? "Meta+A" : "Control+A")
	await page.press(".CodeMirror", "Backspace")
	await page.type(".CodeMirror", text)
}

export async function editorRun(page: Page): Promise<void> {
	await page.press(".CodeMirror", "Control+Enter")
}
