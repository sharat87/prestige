test("Cookies UI reflect responses", async () => {
	await page.goto("http://localhost:3052")
	await page.setEditorText("GET " + process.env.HTTPBUN_URL + "/cookies/set?name=sherlock\n")
	await page.shot()

	const statusEl = await page.editorRun()
	await page.shot()
	await expect(statusEl.evaluate(el => el.textContent)).resolves.toBe("200 Ok")

	// TODO: Why is there a blank line after the first line here?
	await expect(page.$eval(".t-response-body pre", (el) => el.innerText)).resolves.toBe(`1{

2  "cookies": {
3    "name": "sherlock"
4  }
5}`)

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

	await page.setEditorText("GET " + process.env.HTTPBUN_URL + "/cookies/delete?name=\n")
	await page.editorRun()
	await page.shot()
	await expect(page.$(".t-cookies-empty")).resolves.not.toBeNull()
}, 10000)

test("Clear cookies button", async () => {
	await page.goto("http://localhost:3052")
	await page.setEditorText("GET " + process.env.HTTPBUN_URL + "/cookies/set?name=mycroft\n")
	await page.editorRun()
	await page.shot()

	await page.click(".t-cookies-toggle-btn")
	await page.shot()
	await page.shot()

	await expect(page.$eval(".t-cookies-table tbody", (el) => el.innerText)).resolves.toBe([
		"1",
		"localhost.local",
		"/",
		"name",
		"mycroft",
		"n/a",
		"Del",
	].join("\t"))

	await page.click(".t-cookies-clear-all-btn")
	await page.shot()
	await expect(page.$(".t-cookies-empty")).resolves.not.toBeNull()

	await page.reload()
	await page.waitForSelector(".t-cookies-toggle-btn")
	await page.click(".t-cookies-toggle-btn")
	await page.shot()
	await expect(page.$(".t-cookies-empty")).resolves.not.toBeNull()
})
