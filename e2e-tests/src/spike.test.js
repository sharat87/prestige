// import type { Page } from "puppeteer"

describe("sample describe", () => {
	it("sample it", async () => {
		expect("a").toBe("a")
	})
})

//*
describe("OAuth with GitHub", () => {
	it("should work for signing up", async () => {
		page.setViewport({
			width: 1400,
			height: 800,
		})

		page
			.on('console', message =>
				console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
			.on('pageerror', ({ message }) => console.log(message))
			.on('response', response =>
				console.log(`${response.status()} ${response.url()}`))
			.on('requestfailed', request =>
				console.log(`${request.failure().errorText} ${request.url()}`))

		await page.goto("http://localhost:3052")
		await page.screenshot({ path: "./shot0.png" })
		await expect(page).toClick(".t-login-signup-btn")

		await page.screenshot({ path: "./shot1.png" })
		const popup = await clickGetPopup(page, ".t-github-auth-btn")

		await page.screenshot({ path: "./shot2.png" })
		await popup.screenshot({ path: "./shot3.png" })

		await expect(popup).toClick("input[type=submit][value=approve]")
		await popup.waitForNavigation()

		/*
		if (!popup.isClosed()) {
			await popup.screenshot({ path: "./shot4.png" })
			await expect(popup.$eval("h1", e => e.textContent)).resolves.toBe("Finished. This window should close.")
			await popup.close()
		}
		expect(popup.isClosed()).toBeTruthy()
		//*/

		await page.screenshot({ path: "./shot5.png" })
		await expect(page.$eval(".t-user-email", e => e.textContent)).resolves.toBe("dummy_user@localhost")
		await expect(page).toMatchElement(".t-user-email", { text: "dummy_user@localhost" })

		await expect(page.title()).resolves.toMatch("Prestige")
		console.info("abc")
	})
})
//*/

async function clickGetPopup(page, selector) {
	const p1 = new Promise((resolve) => page.once("popup", resolve))
	await page.click(selector)
	return await p1
}

// async function clickGetPopup(page: Page, selector: string): Promise<Page> {
// 	const p1: Promise<Page> = new Promise((resolve) => page.once("popup", resolve))
// 	await page.click(selector)
// 	return await p1
// }

/*
const [popup] = await Promise.all([
	new Promise((resolve) => page.once("popup", async (p) => {
		await p.setRequestInterception(true)
		p.on("request", (interceptedRequest) => {
			const url = new URL(interceptedRequest.url())
			if (url.host === "github.com" && url.pathname === "/login/oauth/authorize") {
				if (url.pathname === "/login/oauth/authorize") {
					const accessTokenResponse = JSON.stringify({
						access_token: "gho_access-token-obviously-fake",
						scope: "repo,gist",
						token_type: "bearer",
					})
					interceptedRequest.respond({
						status: 301,
						headers: {
							"Location": `http://localhost:3052/auth/github/callback?state=${url.searchParams.get("state")}&code=${encodeURIComponent(accessTokenResponse)}`,
						},
						contentType: "text/html",
						body: "<h1>Github OAuth intercepted",
					})
				} else {
					interceptedRequest.respond({
						status: 404,
						contentType: "text/html",
						body: "<h1>Unhandled/irrelevant GitHub request",
					})
				}
			} else {
				interceptedRequest.continue()
			}
		})
		await p.goto("http://localhost:3052/auth/github")
		resolve(p)
	})),
	page.click(".t-github-auth-btn"),
])
//*/

