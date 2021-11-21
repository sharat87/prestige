const puppeteer = require("puppeteer")

beforeEach(async () => {
	const browser = await puppeteer.connect({
		browserWSEndpoint: process.env.PUPPETEER_WS_ENDPOINT,
	})

	global.page = new NicePage(await (await browser.createIncognitoBrowserContext()).newPage())
})

afterEach(async () => {
	global.page.disconnect()
	delete global.page
})

class NicePage {
	constructor(page) {
		this.page = page

		page.setViewport({
			width: 1400,
			height: 800,
		})

		page
			.on("console", message =>
				console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
			.on("pageerror", ({ message }) => console.log(message))
			.on("response", response =>
				console.log(`${response.status()} ${response.url()}`))
			.on("requestfailed", request =>
				console.log(`${request.failure().errorText} ${request.url()}`))
	}

	disconnect() {
		this.page.browser().disconnect()
	}

	goto(url) {
		return this.page.goto(url)
	}

	title() {
		return this.page.title()
	}

	screenshot(options) {
		return this.page.screenshot(options)
	}

	click(selector) {
		return this.page.click(selector)
	}

	async clickGetPopup(selector) {
		const p1 = new Promise((resolve) => this.page.once("popup", resolve))
		await this.click(selector)
		return new NicePage(await p1)
	}

	waitForSelector(selector) {
		return this.page.waitForSelector(selector)
	}

	$eval(selector, fn, ...args) {
		return this.page.$eval(selector, fn, ...args)
	}

	textOf(selector) {
		return this.$eval(selector, e => e.textContent)
	}

	async setEditorText(content) {
		await this.click(".CodeMirror")
		await this.$eval(".CodeMirror", (el, c) => el.CodeMirror.setValue(c), content)
	}
}
