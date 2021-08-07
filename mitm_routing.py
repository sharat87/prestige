import os
from glob import iglob as glob


def requestheaders(flow):
	flow.request.headers["x-original-url"] = flow.request.url

	path = flow.request.path

	if path == "/favicon.ico":
		flow.request.path = "/" + os.path.basename(next(glob("frontend/dist*/favicon.*.ico")))

	if path.startswith(("/docs/", "/livereload/")) or path == "/livereload.js":
		flow.request.host = "localhost"
		flow.request.port = 3042

	if path.startswith(("/api/", "/admin", "/accounts", "/static", "/oauth-callback")):
		flow.request.host = "localhost"
		flow.request.port = 3041
		if path.startswith("/api/"):
			flow.request.path = flow.request.path[4:]

	if path == "/" or path.startswith(("/index.", "/favicon")):
		flow.request.host = "localhost"
		flow.request.port = 3040
