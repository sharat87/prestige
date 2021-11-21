test("Cookies UI reflect responses", async () => {
	await page.goto("http://localhost:3052")
	await page.setEditorText("GET " + process.env.HTTPBUN_URL + "/cookies/set?name=sherlock\n")
	await page.screenshot({ path: "./s1.png" })
})
