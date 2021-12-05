const childProcess = require("child_process")
const fs = require("fs")
const http = require("http")
const puppeteer = require("puppeteer")
const mockerRequestHandler = require("./mocker")

module.exports = async function () {
	global.teardowns = await Promise.all([
		startPuppeteer(),
		startDocsServer(),
		startMocker(),
	])

	await new Promise(resolve => setTimeout(resolve, 2000))
}

async function startPuppeteer() {
	const browser = await puppeteer.launch()
	process.env.PUPPETEER_WS_ENDPOINT = browser.wsEndpoint()
	return () => browser.close()
}

async function startDocsServer() {
	const logStream = fs.createWriteStream("logs/docs.log")
	await new Promise((resolve) => logStream.on("open", resolve))

	const proc = childProcess.spawn("../manage", ["serve-docs"], {
		env: {
			...process.env,
			PORT: process.env.DOCS_PORT,
		},
		stdio: [null, logStream, logStream],
	})

	proc.on("exit", () => {
		logStream.close()
	})

	// TODO: Wait for the server to be ready.
	return () => proc.kill()
}

async function startMocker() {
	const server = http.createServer(mockerRequestHandler)
	const p = new Promise((resolve) => server.on("listening", resolve))
	server.listen(parseInt(process.env.MOCKER_PORT, 10))
	await p
	return () => server.close()
}
