import http.client
import os
import socket
import urllib
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, HTTPServer


# TODO: Have this script run the server processes of backend, frontend and docs on the appropriate ports as well.
# A simple `make serve` that runs this script should start everything!


class ProxyHandler(BaseHTTPRequestHandler):
	protocol_version = "HTTP/1.0"

	def handle_one_request(self):
		# Originally taken from parent class.
		try:
			self.raw_requestline = self.rfile.readline(65537)
		except ValueError:
			self.close_connection = True
			return

		try:
			if len(self.raw_requestline) > 65536:
				self.requestline = ""
				self.request_version = ""
				self.command = ""
				self.send_error(HTTPStatus.REQUEST_URI_TOO_LONG)
				return
			if not self.raw_requestline:
				self.close_connection = True
				return
			if not self.parse_request():
				# An error code has been sent, just exit
				return

			self.do_any_method()

			try:
				self.wfile.flush()  # Actually send the response if not already done.
			except ValueError:
				pass  # The file is probably closed, no matter.

		except socket.timeout as e:
			# A read or a write timed out.  Discard this connection
			self.log_error("Request timed out: %r", e)
			self.close_connection = True

		finally:
			self.finish()

	def do_any_method(self):
		if self.path == "/":
			parts = urllib.parse.urlsplit(self.path)
			new_parts = parts.scheme, parts.netloc, parts.path + "index.html", parts.query, parts.fragment
			new_url = urllib.parse.urlunsplit(new_parts)
			return self.send_redirect(new_url)

		if self.path == "/docs":
			parts = urllib.parse.urlsplit(self.path)
			new_parts = parts.scheme, parts.netloc, parts.path + "/", parts.query, parts.fragment
			new_url = urllib.parse.urlunsplit(new_parts)
			return self.send_redirect(new_url)

		url = self.get_target_url()

		body = None
		if self.command == "POST":
			content_len = int(self.headers.get("content-length", 0))
			body = self.rfile.read(content_len)

		resp = make_request(self.command, url, self.headers, body)

		self.send_response(resp.status)

		for key, value in resp.headers.items():
			self.send_header(key, value)
		self.end_headers()

		if self.command != "HEAD":
			self.wfile.write(resp.read())

	def send_redirect(self, to_url: str):
		self.send_response(HTTPStatus.MOVED_PERMANENTLY)
		self.send_header("Location", to_url)
		self.end_headers()

	def get_target_url(self):
		if self.path.startswith("/docs/"):
			return "http://localhost:3042/" + self.path[len("/docs/"):]
		if self.path.startswith("/livereload.js"):
			return "http://localhost:3042/livereload.js?port=3042"
		if self.path.startswith("/api/"):
			return "http://localhost:3041/" + self.path[len("/api/"):]
		return "http://localhost:3040" + self.path


def make_request(method, url, headers, body):
	parts = urllib.parse.urlsplit(url)
	con = http.client.HTTPConnection(parts.netloc)
	con.request(
		method,
		parts.path + ("?" + parts.query if parts.query else "") + ("#" + parts.fragment if parts.fragment else ""),
		body,
		headers,
	)
	return con.getresponse()


def main():
	port = int(os.getenv("PORT", 3045))
	print(f"Starting reverse proxy at 127.0.0.1:{port}")
	httpd = HTTPServer(("127.0.0.1", port), ProxyHandler)
	httpd.serve_forever()


if __name__ == "__main__":
	main()
