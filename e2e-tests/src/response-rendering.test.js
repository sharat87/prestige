test("Render SVG text", async () => {
	await page.goto(APP_URL)
	await page.setEditorText("GET " + MOCKER_URL + "/image/svg\n\n###\n\n")
	await page.editorRun()
	const statusEl = await page.waitForSelector(".t-response-status")
	await page.shot()

	await expect(statusEl.evaluate(el => el.innerText)).resolves.toBe("200 Ok")

	await page.click(".t-result-tab-text")
	await page.shot()

	await expect(page.$eval(".t-response-body pre", (el) => el.innerText)).resolves.toBe(
` 1<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" height="100%" viewBox="0 0 100 100">
 2
 3  <title>SVG Logo</title>
 4
 5  <a xlink:href="http://www.w3.org/Graphics/SVG/" target="_parent"
 6     xlink:title="W3C SVG Working Group home page">
 7
 8    <rect fill="#f09" x="5" y="5" width="90" height="90" rx="4" ry="4" />
 9
10  </a>
11</svg>`)
})
