test("Get 200", async () => {
	await page.goto("http://localhost:3052")
	await page.setEditorText("GET " + process.env.HTTPBUN_URL + "/get\n\n###\n\n")
	await page.editorRun()
	const statusEl = await page.waitForSelector(".t-response-status")
	await page.shot()

	await expect(statusEl.evaluate(el => el.innerText)).resolves.toBe("200 Ok")
	await expect(page.$eval(".t-response-body pre", (el) => el.innerText)).resolves.toBe([
		" 1{3 items",
		' 2  "args": {},',
		"",
		' 3  "headers": {5 items',
		' 4    "Accept": "*/*",',
		' 5    "Accept-Encoding": "gzip, deflate, br",',
		' 6    "Connection": "keep-alive",',
		` 7    "Host": "${process.env.HTTPBUN_URL.split("/")[2]}",`,
		' 8    "User-Agent": "proxy at prestigemad.com"',
		" 9  },",
		'10  "origin": "127.0.0.1",',
		`11  "url": "${process.env.HTTPBUN_URL}/get"`,
		"12}",
	].join("\n"))
})
