const http = require("http")

http.createServer(onRequest).listen(3000)

function onRequest(clientReq, clientRes) {
	const url = new URL(clientReq.url)

	const options = {
		protocol: url.protocol,
		host: url.hostname,
		port: url.port || (url.protocol === "http:" ? 80 : 443),
		path: url.pathname + (url.search || "") + (url.hash || ""),
		method: clientReq.method,
		headers: clientReq.headers,
	}

	console.log("Handle", clientReq.method, url, clientReq.headers, options)
	const proxyReq = http.request(options, (proxyRes) => {
		clientRes.writeHead(proxyRes.statusCode, proxyRes.headers)
		proxyRes.pipe(clientRes, {
			end: true,
		})
	})

	clientReq.pipe(proxyReq, {
		end: true,
	})
}
