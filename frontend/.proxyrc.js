const { createProxyMiddleware } = require("http-proxy-middleware")

const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || 3041, 10)
const DOCS_PORT = parseInt(process.env.DOCS_PORT || 3042, 10)

module.exports = function (app) {

	app.use(createProxyMiddleware(
		[
			"/admin",
			"/auth",
			"/env",
			"/gist",
			"/health",
			"/proxy",
			"/static",
			"/storage",
		],
		{
			target: `http://localhost:${BACKEND_PORT}`,
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
