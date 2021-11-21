test("GitHub OAuth approved signup", async () => {
	await page.goto("http://localhost:3052")
	await page.screenshot({ path: "./shot0.png" })
	await expect(page.textOf(".t-login-signup-btn")).resolves.toEqual(expect.stringContaining("LogIn/SignUp"))
	await page.click(".t-login-signup-btn")

	await page.screenshot({ path: "./shot1.png" })
	const popup = await page.clickGetPopup(".t-github-auth-btn")

	await page.screenshot({ path: "./shot2.png" })
	await popup.screenshot({ path: "./shot3.png" })

	await popup.click("input[type=submit][value=approve]")

	/*
	if (!popup.isClosed()) {
		await popup.screenshot({ path: "./shot4.png" })
		await expect(popup.$eval("h1", e => e.textContent)).resolves.toBe("Finished. This window should close.")
		await popup.close()
	}
	expect(popup.isClosed()).toBeTruthy()
	//*/

	await page.waitForSelector(".t-user-email")
	await page.screenshot({ path: "./shot5.png" })
	await expect(page.textOf(".t-user-email")).resolves.toBe("dummy_user@localhost")

	await expect(page.title()).resolves.toMatch("Prestige")
})

test("GitHub OAuth rejected signup", async () => {
	await page.goto("http://localhost:3052")
	await page.screenshot({ path: "./shot7.png" })
	await expect(page.title()).resolves.toMatch("Prestige")
})
