import os
from glob import iglob


PROXY_PORT = int(os.getenv("PROXY_PORT", 3045))
FRONTEND_PORT = int(os.getenv("FRONTEND_PORT", 3040))
BACKEND_PORT = int(os.getenv("BACKEND_PORT", 3041))
DOCS_PORT = int(os.getenv("DOCS_PORT", 3042))


def requestheaders(flow):
	req = flow.request
	req.headers["x-original-url"] = req.url

	if req.path == "/favicon.ico":
		req.host = "localhost"
		req.port = FRONTEND_PORT
		req.path = "/" + os.path.basename(next(iglob("frontend/dist-serve/favicon.*.ico")))

	elif req.path == "/" or req.path.startswith(("/index.", "/favicon")):
		req.host = "localhost"
		req.port = FRONTEND_PORT

	elif req.path.startswith(("/docs/", "/livereload/")) or req.path == "/livereload.js":
		req.host = "localhost"
		req.port = DOCS_PORT

	elif req.path.startswith(("/proxy", "/auth", "/storage", "/admin", "/gist", "/static", "/env", "/health")):
		req.host = "localhost"
		req.port = BACKEND_PORT

	# Fix host header to include port, if non-standard.
	# Need the right Host header, so that correct redirect_uri is generated for OAuth flows.
	# req.headers["Host"] = req.host + ((":" + str(req.port)) if req.port != 80 else "")
	req.headers["Host"] = f"localhost:{PROXY_PORT}"
