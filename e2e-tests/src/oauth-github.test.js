test("GitHub OAuth approved signup", async () => {
	await page.goto(APP_URL)
	await page.shot()
	await expect(page.textOf(".t-login-signup-btn")).resolves.toEqual(expect.stringContaining("LogIn/SignUp"))
	await page.click(".t-login-signup-btn")

	await page.shot()
	const popup = await page.clickGetPopup(".t-github-auth-btn")

	await page.shot()
	await popup.shot()

	await popup.click("input[type=submit][value=approve]")
	await page.shot()

	await page.waitForSelector(".t-user-email")
	await page.shot()
	await expect(page.textOf(".t-user-email")).resolves.toBe("dummy_user@localhost")

	await expect(page.title()).resolves.toMatch("Prestige")
	// TODO: Verify cookies.
})

test("GitHub OAuth rejected signup", async () => {
	await page.goto(APP_URL)
	await page.shot()
	await expect(page.title()).resolves.toMatch("Prestige")
	await page.click(".t-login-signup-btn")

	await page.shot()
	const popup = await page.clickGetPopup(".t-github-auth-btn")

	await page.shot()
	await popup.shot()

	await popup.click("input[type=submit][value=reject]")
	await page.shot()

	await page.waitForSelector(".t-github-auth-btn")
	await page.shot()

	await expect(page.title()).resolves.toMatch("Prestige")
	// TODO: Verify cookies.
})
