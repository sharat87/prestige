const { createProxyMiddleware } = require("http-proxy-middleware")

const bindAddress = process.env.PRESTIGE_BIND || "localhost:3041"
const backendTarget = bindAddress.startsWith("unix/")
	? { socketPath: bindAddress.substring("unix/".length) }
	: `http://${bindAddress}`

const DOCS_PORT = parseInt(process.env.DOCS_PORT || 3042, 10)

module.exports = function (app) {

	app.use(createProxyMiddleware(
		[
			"/auth",
			"/env",
			"/gist",
			"/health",
			"/proxy",
		],
		{
			target: backendTarget,
		},
	))

	app.use(createProxyMiddleware(
		[
			"/docs",
			"/livereload",
		],
		{
			target: `http://localhost:${DOCS_PORT}`,
		},
	))

}
