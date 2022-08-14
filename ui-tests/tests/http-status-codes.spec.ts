import { expect, test } from "@playwright/test"
import { editorRun, setEditorText } from "./utils"

test("Get 200", async ({ page }) => {
	await page.goto("/")
	await setEditorText(page, "GET http://localhost:3043/status/200")
	await editorRun(page)

	const statusEl = page.locator(".t-response-status")
	await statusEl.waitFor()
	await expect(statusEl).toHaveText("200 Ok")

	// The `1` is the line number.
	await expect(page.locator(".t-response-body pre")).toHaveText("1200 OK")
})

test("Get 400", async ({ page }) => {
	await page.goto("/")
	await setEditorText(page, "GET http://localhost:3043/status/400")
	await editorRun(page)

	const statusEl = page.locator(".t-response-status")
	await statusEl.waitFor()
	await expect(statusEl).toHaveText("400 Bad Request")

	// The `1` is the line number.
	await expect(page.locator(".t-response-body pre")).toHaveText("1400 Bad Request")
})
