test("Cookies UI reflect responses", async () => {
	await page.goto(APP_URL)
	await page.setEditorText("GET " + MOCKER_URL + "/cookies/set?name=sherlock\n")
	await page.shot()

	const statusEl = await page.editorRun()
	await page.shot()
	await expect(statusEl.evaluate(el => el.textContent)).resolves.toBe("200 Ok")

	await expect(page.$eval(".t-response-body pre", (el) => el.innerText)).resolves.toBe("1ok")

	await page.click(".t-cookies-toggle-btn")
	await page.shot()

	await expect(page.$eval(".t-cookies-table tbody", (el) => el.innerText)).resolves.toBe([
		"1",
		"localhost.local",
		"/",
		"name",
		"sherlock",
		"n/a",
		"Del",
	].join("\t"))

	await page.setEditorText("GET " + MOCKER_URL + "/cookies/delete?name=\n")
	await page.editorRun()
	await page.shot()
	await expect(page.$(".t-cookies-empty")).resolves.not.toBeNull()
}, 10000)

test("Setting multiple cookies", async () => {
	await page.goto(APP_URL)
	await page.setEditorText("GET " + MOCKER_URL + "/cookies/set?name=mycroft&brother=sherlock\n")
	await page.editorRun()
	await page.shot()

	await page.click(".t-cookies-toggle-btn")
	await page.shot()

	await expect(page.$eval(".t-cookies-table tbody", (el) => el.innerText)).resolves.toBe([
		[
			"1",
			"localhost.local",
			"/",
			"brother",
			"sherlock",
			"n/a",
			"Del",
		].join("\t"),
		[
			"2",
			"localhost.local",
			"/",
			"name",
			"mycroft",
			"n/a",
			"Del",
		].join("\t"),
	].join("\n"))
})
