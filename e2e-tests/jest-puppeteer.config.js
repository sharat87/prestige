// Ref: <https://github.com/smooth-code/jest-puppeteer/blob/master/packages/jest-environment-puppeteer/README.md>.
module.exports = {
	browserContext: "incognito",
	headless: process.env.HEADLESS !== "false",
}
