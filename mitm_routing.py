import os
from glob import iglob


def requestheaders(flow):
	req = flow.request
	req.headers["x-original-url"] = req.url

	if req.path == "/favicon.ico":
		req.host = "localhost"
		req.port = 3040
		req.path = "/" + os.path.basename(next(iglob("frontend/dist-serve/favicon.*.ico")))

	elif req.path == "/" or req.path.startswith(("/index.", "/favicon")):
		req.host = "localhost"
		req.port = 3040

	elif req.path.startswith(("/docs/", "/livereload/")) or req.path == "/livereload.js":
		req.host = "localhost"
		req.port = 3042

	elif req.path.startswith(("/proxy", "/auth", "/admin", "/static", "/health")):
		req.host = "localhost"
		req.port = 3041
		if req.path.startswith("/api/"):
			req.path = req.path[4:]

	# Fix host header to include port, if non-standard.
	# Need the right Host header, so that correct redirect_uri is generated for OAuth flows.
	# req.headers["Host"] = req.host + ((":" + str(req.port)) if req.port != 80 else "")
	req.headers["Host"] = "localhost:3045"
