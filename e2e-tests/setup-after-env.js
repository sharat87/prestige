const fs = require("fs/promises")
const puppeteer = require("puppeteer")

beforeEach(async () => {
	const browser = await puppeteer.connect({
		browserWSEndpoint: process.env.PUPPETEER_WS_ENDPOINT,
	})

	global.page = await NicePage.fromPage(await (await browser.createIncognitoBrowserContext()).newPage(), null)

	global.MOCKER_URL = `http://localhost:${process.env.MOCKER_PORT}`
	global.APP_URL = process.env.APP_URL
})

afterEach(async () => {
	await global.page.disconnect()
	delete global.page
})

const shotCounters = {}

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
		if (this.parentNicePage != null) {
			throw new Error("Cannot call disconnect on a child page.")
		}

		const browser = this.page.browser()

		// Close the log file handles _after_ the browser is disconnected, otherwise there's attempts to write to
		// log file _after_ the browser is disconnected which obviously fails.
		browser.once("disconnected", async () => {
			await Promise.all([
				this.consoleLogFd.close(),
				this.requestLogFd.close(),
			])
		})

		browser.disconnect()
	}

	goto(url) {
		return this.page.goto(url)
	}

	reload() {
		return this.page.reload()
	}

	close() {
		return this.page.close()
	}

	title() {
		return this.page.title()
	}

	shot(title) {
		const shotId = shotCounters[this.shotsPath] = (shotCounters[this.shotsPath] || 0) + 1
		return this.page.screenshot({
			path: this.shotsPath + "/" + pad(shotId) + (title ? `-${title}` : "") + ".png",
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
