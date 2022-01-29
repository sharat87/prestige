import base64
import logging
from http import HTTPStatus
import json
from typing import Dict, Union, Any, Optional

import requests
from django.conf import settings
from django.http import JsonResponse, HttpResponseNotAllowed
from django.shortcuts import redirect
from django.views.decorators.csrf import csrf_exempt
from requests.cookies import RequestsCookieJar

log = logging.getLogger(__name__)

TEXT_CONTENT_TYPES = {
	"application/json",
	"application/x-www-form-urlencoded",
	"image/svg+xml",
}

PlainCookieJarType = Dict[str, Dict[str, Dict[str, Dict[str, Union[str, int, bool]]]]]


@csrf_exempt
def proxy(request):
	if request.method == "GET":
		return redirect("https://prestigemad.com/docs/guides/proxy/")
	elif request.method != "POST":
		return HttpResponseNotAllowed(["GET", "POST"], "<h1>405 Method Not Allowed</h1>")

	job: Dict[str, Any] = request.parsed_body

	method: str = job.get("method", "GET")

	url: Optional[str] = job.get("url")

	if not url:
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Missing URL in payload", data={
			"error": {
				"message": "Missing endpoint URL to proxy to.",
			},
		})

	if not isinstance(url, str):
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Incorrect data type of URL", data={
			"error": {
				"message": "URL should be a string.",
			},
		})

	if not is_url_allowed(url):
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Endpoint not allowed", data={
			"error": {
				"message": "This URL is not allowed on this proxy.",
			},
		})

	# Logging part of URLs here to help prevent abuse.
	log.info("ProxyingTo %r %r", method, url and url.split("?")[0])

	headers: Dict[str, str] = {name: value for name, value in job["headers"]} if job.get("headers") else {}
	body: Optional[str] = job.get("body")
	body_type: Optional[str] = job.get("bodyType")
	cookies: Optional[PlainCookieJarType] = job.get("cookies")
	timeout: int = job.get("timeout", 10)

	session = requests.session()
	session.headers["User-Agent"] = "proxy at prestigemad.com"

	if cookies:
		update_cookie_jar(session.cookies, cookies)

	if body_type == "multipart/form-data":
		body_dict = json.loads(body)
		if not isinstance(body_dict, dict):
			return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Invalid body type", data={
				"error": {
					"code": "invalid-body-type-for-multipart",
					"message": "Body should be a JSON serialized object for multipart requests.",
				},
			})

		# The content-type will be set with an appropriate boundary value by the `request` method below.
		del headers["content-type"]

		data = {}
		files = {}

		for key, value in body_dict.items():
			if isinstance(value, dict):
				files[key] = value["name"], base64.b64decode(value["body"]), value["type"]
			elif isinstance(value, bool):
				data[key] = "true" if value else "false"
			elif value is None:
				data[key] = "null"
			else:
				data[key] = value

	else:
		data = None if body is None else body.encode("utf-8")
		files = None

	try:
		response = session.request(
			method=method,
			url=url,
			headers=headers,
			data=data,
			files=files,
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
		"id": job.get("id"),
		"response": response_to_dict(response),
		"history": list(map(response_to_dict, response.history)),
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
	plain: PlainCookieJarType = {}

	for cookie in cookie_jar:
		if cookie.value is None:
			continue

		domain = cookie.domain
		path = cookie.path

		if domain not in plain:
			plain[domain] = {}

		if path not in plain[domain]:
			plain[domain][path] = {}

		details = plain[domain][path][cookie.name] = {
			"value": cookie.value,
			"secure": cookie.secure,
		}

		if cookie.expires is not None:
			details["expires"] = cookie.expires

	return plain


def response_to_dict(response: requests.Response):
	body_in_response = get_body_in_response(response)

	request_body = response.request.body
	if isinstance(request_body, bytes):
		# TODO: Figure out a better way to show the body _bytes_ here, instead of assuming UTF-8.
		request_body = request_body.decode()

	return {
		"url": response.url,
		"status": response.status_code,
		"statusText": response.reason,
		"headers": list(response.headers.items()),
		"body": body_in_response,
		"request": {
			"url": response.request.url,
			"method": response.request.method,
			"headers": list(response.request.headers.items()),
			"body": request_body,
		},
	}


def get_body_in_response(response: requests.Response) -> Optional[str]:
	if response.headers.get("Content-Length") == "0":
		return None

	content_type = response.headers.get("Content-Type")
	if not content_type:
		return None

	content = response.content
	media_type, *args = map(str.strip, content_type.split(";"))

	if media_type.startswith("text/") or media_type in TEXT_CONTENT_TYPES:
		charset = "UTF-8"

		for arg in args:
			if arg.startswith("charset="):
				charset = arg[len("charset="):]

		return content.decode(encoding=charset)

	elif isinstance(content, bytes):
		return base64.b64encode(content).decode("utf-8")

	return content


def is_url_allowed(url: str):
	if not url:
		return False

	parts = url.split("/")
	if len(parts) < 3:
		return False

	host_port = parts[2]
	host = (host_port.split(":")[0] if ":" in host_port else host_port).lower()

	return host not in settings.PROXY_DISALLOW_HOSTS
