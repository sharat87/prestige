test("Load docs", async () => {
	await page.goto(`http://localhost:${process.env.DOCS_PORT}`)
	await page.shot()
})
