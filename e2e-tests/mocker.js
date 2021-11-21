/*
 * A fake GitHub API, mocking endpoints needed by Prestige, for testing Prestige.
 */

const http = require("http")
const { inspect } = require("util")
start()

function start() {
	const server = http.createServer(requestHandler)
	server.listen(parseInt(process.env.PORT || 3046))
}

async function requestHandler(req, res) {
	const url = new URL(req.url, "http://" + req.headers.host)
	console.log("url", url, url.searchParams)

	const body = await new Promise((resolve) => {
		let parts = []
		req.on("data", (data) => parts.push(data))
		req.on("end", () => resolve(parts.join("")))
	})

	if (url.pathname === "/health") {
		res.writeHead(200, {
			"Content-Type": "application/json",
		})
		res.end(JSON.stringify({ok: true}))
		return

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
		"Location": `http://localhost:3052/auth/github/callback?state=${url.searchParams.get("state")}&code=abcdef`,
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
