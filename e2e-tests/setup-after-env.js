const fs = require("fs/promises")
const puppeteer = require("puppeteer")

beforeEach(async () => {
	const browser = await puppeteer.connect({
		browserWSEndpoint: process.env.PUPPETEER_WS_ENDPOINT,
	})

	global.page = await NicePage.fromPage(await (await browser.createIncognitoBrowserContext()).newPage(), null)
})

afterEach(async () => {
	await global.page.disconnect()
	delete global.page
})

class NicePage {
	static async fromPage(page, parentNicePage) {
		const np = new NicePage
		await np.initPage(page, parentNicePage)
		return np
	}

	async initPage(page, parentNicePage) {
		this.page = page
		this.parentNicePage = parentNicePage
		this.keyboard = page.keyboard

		page.setViewport({
			width: 1400,
			height: 800,
		})

		const currentTest = expect.getState().currentTestName
		this.trailPath = "trail/" + expect.getState().currentTestName.toLowerCase().replace(/[-\s:?*|/\\]+/g, "-")

		this.nextShotId = 1
		this.shotsPath = this.trailPath + "/shots"
		await fs.mkdir(this.shotsPath, {
			recursive: true,
		})

		if (this.parentNicePage == null) {
			const logsPath = this.trailPath + "/logs"
			await fs.mkdir(logsPath, {
				recursive: true,
			})
			// Use write streams here to speed up? <https://nodejs.org/api/fs.html#filehandlecreatewritestreamoptions>.
			this.consoleLogFd = await fs.open(logsPath + "/console.log", "w")
			this.requestLogFd = await fs.open(logsPath + "/requests.log", "w")

		} else {
			this.consoleLogFd = this.parentNicePage.consoleLogFd
			this.requestLogFd = this.parentNicePage.requestLogFd

		}

		page
			.on("console", (message) => this.consoleLogFd.write(
				`${message.type().substr(0, 3).toUpperCase()} ${message.text()}\n`,
			))
			.on("pageerror", ({ message }) => console.error(message))
			.on("response", (response) => this.requestLogFd.write(
				`${response.status()} ${response.url()}\n`,
			))
			.on("requestfailed", (request) => this.requestLogFd.write(
				`${request.failure().errorText} ${request.url()}\n`
			))
	}

	async disconnect() {
		if (this.parentNicePage == null) {
			await Promise.all([
				this.consoleLogFd.close(),
				this.requestLogFd.close(),
			])
		}
		this.page.browser().disconnect()
	}

	goto(url) {
		return this.page.goto(url)
	}

	reload() {
		return this.page.reload()
	}

	title() {
		return this.page.title()
	}

	shot(options) {
		return this.page.screenshot({
			path: this.shotsPath + "/" + pad(this.nextShotId++) + ".png",
			fullPage: true,
		})
	}

	click(selector) {
		return this.page.click(selector)
	}

	async clickGetPopup(selector) {
		const p1 = new Promise((resolve) => this.page.once("popup", resolve))
		await this.click(selector)
		return await NicePage.fromPage(await p1, this)
	}

	waitForNavigation(options) {
		return this.page.waitForNavigation(options)
	}

	waitForSelector(selector) {
		return this.page.waitForSelector(selector)
	}

	$(selector) {
		return this.page.$(selector)
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

	async editorRun() {
		await this.page.keyboard.down("Control")
		await this.page.keyboard.press("Enter")
		await this.page.keyboard.up("Control")
		return await this.page.waitForSelector(".t-response-status")
	}
}

function pad(n) {
	return (n < 10 ? "0" : "") + n
}
