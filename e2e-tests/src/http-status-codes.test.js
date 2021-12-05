test("Get 200", async () => {
	await page.goto(APP_URL)
	await page.setEditorText("GET " + MOCKER_URL + "/inspect\n\n###\n\n")
	await page.editorRun()
	const statusEl = await page.waitForSelector(".t-response-status")
	await page.shot()

	await expect(statusEl.evaluate(el => el.innerText)).resolves.toBe("200 Ok")
	await expect(page.$eval(".t-response-body pre", (el) => el.innerText)).resolves.toBe([
		"1{",
		'2  "method": "GET"',
		"3}",
	].join("\n"))
})
