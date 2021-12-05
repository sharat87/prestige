/*
 * A fake GitHub API, mocking endpoints needed by Prestige, for testing Prestige.
 */

const { Console } = require("console")
const fs = require("fs")
const { inspect } = require("util")

const console = process.env.MOCKER_LOGS ? new Console(fs.createWriteStream(process.env.MOCKER_LOGS)) : global.console

module.exports = async function requestHandler(req, res) {
	const url = new URL(req.url, "http://" + req.headers.host)
	console.log("url", url, url.searchParams)

	const body = await new Promise((resolve) => {
		let parts = []
		req.on("data", (data) => parts.push(data))
		req.on("end", () => resolve(parts.join("")))
	})

	if (url.pathname === "/health") {
		writeJson(res, {ok: true})

	} else if (url.pathname === "/inspect") {
		writeJson(res, {
			method: req.method,
		})

	} else if (url.pathname === "/cookies/set") {
		const cookies = url.search.substr(1).split("&")
		for (let i = cookies.length; i--;) {
			cookies[i] += "; Path=/"
		}
		res.writeHead(200, {
			"Content-Type": "text/plain",
			"Set-Cookie": cookies,
		})
		res.end("ok")

	} else if (url.pathname === "/cookies/delete") {
		const cookies = []
		for (const key of url.searchParams.keys()) {
			cookies.push(`${key}=; Path=/; Max-Age=0`)
		}
		res.writeHead(200, {
			"Content-Type": "text/plain",
			"Set-Cookie": cookies,
		})
		res.end("ok")

	} else if (url.pathname === "/image/svg") {
		res.writeHead(200, {
			"Content-Type": "image/svg+xml",
		})
		res.end(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" height="100%" viewBox="0 0 100 100">

  <title>SVG Logo</title>

  <a xlink:href="http://www.w3.org/Graphics/SVG/" target="_parent"
     xlink:title="W3C SVG Working Group home page">

    <rect fill="#f09" x="5" y="5" width="90" height="90" rx="4" ry="4" />

  </a>
</svg>`)

	} else if (url.pathname === "/https://github.com/login/oauth/authorize") {
		// Ask user for OAuth consent.
		handleGitHubOauthForm(req, url, res)

	} else if (url.pathname === "/github-oauth-submit") {
		// Handle consent submission.
		handleGitHubOauthSubmit(req, url, res)

	} else if (url.pathname === "/https://github.com/login/oauth/access_token") {
		// Generate and return an access token to use GitHub API with.
		handleGitHubOauthAccessToken(req, url, res)

	} else if (url.pathname === "/https://api.github.com/graphql") {
		// Respond to *known* GitHub GraphQL queries.
		handleGitHubApiGraphQL(req, url, body, res)

	} else if (url.pathname === "/https://api.github.com/user/emails") {
		// Respond with dummy email information from GitHub.
		handleGitHubApiEmails(req, url, res)

	} else if (url.pathname === "/https://api.github.com/repos/sharat87/prestige") {
		// Respond with dummy email information from GitHub.
		handleGitHubApiRepoInfo(res)

	} else {
		res.writeHead(404)
		res.end(`No handler for ${req.method} ${req.url}`)

	}
}

function writeJson(res, body) {
	res.writeHead(200, {
		"Content-Type": "application/json",
	})
	res.end(JSON.stringify(body))
}

function handleGitHubOauthForm(req, url, res) {
	res.writeHead(200, {
		"Content-Type": "text/html",
	})
	res.end([
		"<!doctype html>",
		"<title>Fake GitHub OAuth Consent</title>",
		"<h1>Fake GitHub OAuth Consent</h1>",
		`<pre>${inspect(url)}</pre>`,
		`<pre>${inspect(req.headers)}</pre>`,
		"<form action=/github-oauth-submit>",
		`Client ID: <input name=client_id value="${url.searchParams.get("client_id")}"><br>`,
		`Scope: <input name=scope value="${url.searchParams.get("scope")}"><br>`,
		`State: <input name=state value="${url.searchParams.get("state")}"><br>`,
		"<input type=submit name=action value=approve>",
		"<input type=submit name=action value=reject>",
		"</form>",
	].join("\n"))
}

function handleGitHubOauthSubmit(req, url, res) {
	// Handle accress rejection.
	res.writeHead(301, {
		"Content-Type": "text/html",
		"Location": `${process.env.APP_URL}/auth/github/callback?state=${url.searchParams.get("state")}&code=abcdef`,
	})
	res.end([
		"<!doctype html>",
		"<title>Fake GitHub OAuth Submit</title>",
		"<h1>Redirecting back to the application</h1>",
		`<pre>${inspect(url)}</pre>`,
		`<pre>${inspect(req.headers)}</pre>`,
	].join("\n"))
}

function handleGitHubOauthAccessToken(req, url, res) {
	// Validate the code.
	res.writeHead(200, {
		"Content-Type": "application/json",
	})
	res.end(JSON.stringify({
		access_token: "gho_" + url.searchParams.code,
		scope: "repo,gist",
		token_type: "bearer",
	}))
}

function handleGitHubApiGraphQL(req, url, body, res) {
	// Validate the bearer token.
	const compactQuery = JSON.parse(body).query.replace(/\s+/g, " ").trim()
	if (compactQuery === "{ viewer { db_id: databaseId uid: id login avatarUrl email } }") {
		res.writeHead(200, {
			"Content-Type": "application/json",
		})
		res.end(JSON.stringify({
			data: {
				viewer: {
					uid: "github-uid",
					db_id: 42,
					login: "github-login",
					avatarUrl: "github-avatar-url",
					email: "github-email",
				},
			},
		}))
	} else {
		console.error("Unknown GraphQL query", compactQuery)
		res.writeHead(500, {
			"Content-Type": "text/plain",
		})
		res.end(compactQuery)
	}
}

function handleGitHubApiEmails(req, url, res) {
	// Validate the bearer token.
	res.writeHead(200, {
		"Content-Type": "application/json",
	})
	res.end(JSON.stringify([
		{
			email: "dummy_user@localhost",
			verified: true,
			primary: true,
		},
	]))
}

function handleGitHubApiRepoInfo(res) {
	res.writeHead(200, {
		"Content-Type": "application/json",
		"Access-Control-Allow-Origin": "*",
	})
	res.end(JSON.stringify({
		stargazers_count: 42,
	}))
}
