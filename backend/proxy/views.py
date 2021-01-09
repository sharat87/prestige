import logging
from http import HTTPStatus
from typing import Dict, Union, Any

import requests
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from requests.cookies import RequestsCookieJar

log = logging.getLogger(__name__)

TEXT_CONTENT_TYPES = {
	"application/json",
	"application/x-www-form-urlencoded",
	"image/svg+xml",
}

PlainCookieJarType = Dict[str, Dict[str, Dict[str, Dict[str, Union[str, int, bool]]]]]


@require_POST
@csrf_exempt
def proxy(request) -> JsonResponse:
	job: Dict[str, Any] = request.parsed_body

	method: str = job.get("method", "GET")

	url: str = job.get("url")

	if not url:
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Missing URL in payload", data={
			"error": {
				"message": "Missing endpoint URL to proxy to.",
			},
		})

	if not is_url_allowed(url):
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Endpoint not allowed", data={
			"error": {
				"message": "This URL is not allowed on this proxy.",
			},
		})

	if not isinstance(url, str):
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Incorrect data type of URL", data={
			"error": {
				"message": "URL should be a string.",
			},
		})

	headers: Dict[str, str] = {name: value for name, value in job["headers"]} if job.get("headers") else {}
	body: str = job.get("body")
	cookies: PlainCookieJarType = job.get("cookies")
	timeout: int = job.get("timeout", 10)

	session = requests.session()

	if cookies:
		update_cookie_jar(session.cookies, cookies)

	try:
		response = session.request(
			method=method,
			url=url,
			headers=headers,
			data=body,
			timeout=timeout,
			verify=False,
		)

	except requests.exceptions.ConnectionError:
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Proxied endpoint unreachable", data={
			"error": {
				"message": "Error connecting to host at {}.".format(url),
			},
		})

	except requests.exceptions.MissingSchema:
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Invalid URL in body", data={
			"error": {
				"message": "Invalid URL: '{0}'. Perhaps you meant 'http://{0}'".format(url),
			},
		})

	return JsonResponse(status=HTTPStatus.OK, data={
		"ok": True,  # TODO: This response field is deprecated. HTTP status code 200 serves this purpose already.
		"id": job.get("id"),
		"response": response_to_dict(response, body),
		"history": [response_to_dict(r) for r in response.history],
		"cookies": cookie_jar_to_plain(session.cookies),
	})


def update_cookie_jar(cookie_jar: RequestsCookieJar, cookies_data: PlainCookieJarType) -> None:
	for domain, by_path in cookies_data.items():
		for path, by_name in by_path.items():
			for name, value_dict in by_name.items():
				cookie_jar.set(
					domain=domain,
					path=path,
					name=name,
					value=value_dict.get("value", ""),
					expires=value_dict.get("expires") or None,
					secure=value_dict.get("secure"),
				)


def cookie_jar_to_plain(cookie_jar: RequestsCookieJar) -> PlainCookieJarType:
	plain = {}

	for cookie in cookie_jar:
		domain = cookie.domain
		path = cookie.path

		if domain not in plain:
			plain[domain] = {}

		if path not in plain[domain]:
			plain[domain][path] = {}

		plain[domain][path][cookie.name] = {
			"value": cookie.value,
			"expires": cookie.expires,
			"secure": cookie.secure,
		}

	return plain


def response_to_dict(response: requests.Response, body=None):
	body_in_response = get_body_in_response(response)
	return {
		"url": response.url,
		"status": response.status_code,
		"statusText": response.reason,
		"headers": list(response.headers.items()),
		"body": body_in_response,
		"request": {
			"method": response.request.method,
			"headers": list(response.request.headers.items()),
			"body": body,
		}
	}


def get_body_in_response(response: requests.Response):
	if response.headers.get("Content-Length") == "0":
		return None

	content_type = response.headers.get("Content-Type")
	media_type, *args = map(str.strip, content_type.split(";"))

	if media_type.startswith("text/") or media_type in TEXT_CONTENT_TYPES:
		charset = "UTF-8"

		for arg in args:
			if arg.startswith("charset="):
				charset = arg[len("charset="):]

		return response.content.decode(encoding=charset)

	return response.content


def is_url_allowed(url: str):
	if not url:
		return False

	parts = url.split("/")
	if len(parts) < 3:
		return False

	host_port = parts[2]
	host = (host_port.split(":")[0] if ":" in host_port else host_port).lower()

	return host not in {"localhost", "127.0.0.1"}
