import json
import logging
from typing import Dict, Union

import requests
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from requests.cookies import RequestsCookieJar, create_cookie

log = logging.getLogger(__name__)

TEXT_CONTENT_TYPES = {
	"application/json",
	"application/x-www-form-urlencoded",
	"image/svg+xml",
}

PlainCookieJarType = Dict[str, Dict[str, Dict[str, Dict[str, Union[str, int, bool]]]]]


@require_POST
@csrf_exempt
def proxy(request):
	return JsonResponse(run_job(json.loads(request.body.decode("utf-8"))))


def run_job(job):
	url: str = job["url"]
	headers: Dict[str, str] = {name: value for name, value in job["headers"]}
	body: str = job.get("body")
	cookie_jar: RequestsCookieJar = plain_to_cookie_jar(job.get("cookies"))
	timeout: int = job.get("timeout", 10)

	session = requests.session()
	response = session.request(job["method"], url, headers=headers, data=body, timeout=timeout, verify=False)

	payload = {
		"ok": response.ok,
		"id": job.get("id"),
	}

	if response.ok:
		payload.update(
			response=response_to_dict(response, body),
			history=[response_to_dict(r) for r in response.history],
			cookies=cookie_jar_to_plain(cookie_jar),
		)

	else:
		payload.update(
			error={
				"message": response.reason,
			},
		)

	return payload


def plain_to_cookie_jar(cookies_data: PlainCookieJarType) -> RequestsCookieJar:
	cookie_jar = RequestsCookieJar()

	for host, by_path in cookies_data.items():
		for path, by_name in by_path.items():
			for name, value_dict in by_name.items():
				cookie_jar.set_cookie(create_cookie(
					name,
					value_dict.get("value", ""),
					expires=value_dict.get("expires") or 0,
					secure=value_dict.get("secure"),
					domain=host,
					path=path,
				))

	return cookie_jar


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

	return dict(plain)


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
