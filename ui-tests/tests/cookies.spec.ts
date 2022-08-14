import { expect, test } from "@playwright/test"
import { editorRun, setEditorText } from "./utils"

test("Load Prestige", async ({ page }) => {
	await page.goto("/")
	await expect(page).toHaveTitle(/Prestige/)
})

test("Cookies UI reflect responses", async ({ page }) => {
	await page.goto("/")

	await setEditorText(page, "GET http://localhost:3043/cookies/set?detective=sherlock")
	await editorRun(page)
	await page.waitForSelector(".result-pane")

	await expect(page.locator(".t-response-status")).toHaveText(["200 Ok", "302 Found"])

	await page.click(".t-cookies-toggle-btn")

	const tr = page.locator(".t-cookies-table tbody tr")
	await expect(tr).toHaveCount(1)

	await expect(tr.locator("> *").allInnerTexts()).resolves.toEqual([
		"1",
		"localhost:3043",
		"/",
		"detective",
		"sherlock",
		"n/a",
		"Del",
	])

	await expect(tr.locator(".t-domain")).toHaveText("localhost:3043")
	await expect(tr.locator(".t-path")).toHaveText("/")
	await expect(tr.locator(".t-name")).toHaveText("detective")
	await expect(tr.locator(".t-value")).toHaveText("sherlock")

	await setEditorText(page, "GET http://localhost:3043/cookies/delete?detective=")
	await editorRun(page)
	await page.waitForSelector(".t-response-status")
	await page.waitForSelector(".t-cookies-empty")
	await expect(page.locator(".t-cookies-empty")).toBeVisible()
})

test("Setting multiple cookies", async ({ page }) => {
	await page.goto("/")
	await setEditorText(page, "GET http://localhost:3043/cookies/set?name=mycroft&brother=sherlock\n")
	await editorRun(page)

	await expect(page.locator(".t-response-status")).toHaveText(["200 Ok", "302 Found"])

	await page.click(".t-cookies-toggle-btn")

	const tr = page.locator(".t-cookies-table tbody tr")
	await expect(tr).toHaveCount(2)

	await expect(tr.nth(0).locator("> *").allInnerTexts()).resolves.toEqual([
		"1",
		"localhost:3043",
		"/",
		"brother",
		"sherlock",
		"n/a",
		"Del",
	])

	await expect(tr.nth(1).locator("> *").allInnerTexts()).resolves.toEqual([
		"2",
		"localhost:3043",
		"/",
		"name",
		"mycroft",
		"n/a",
		"Del",
	])
})
