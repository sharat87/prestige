import json
import logging
import sys

from django.core.management import execute_from_command_line
import requests


log = logging.getLogger(__name__)


def mocked_request_fn(*args, **kwargs):
	url = kwargs.get("url")

	if url == "https://github.com/login/oauth/access_token":
		code = kwargs.get("params", {}).get("code")
		log.error("access_token for code %r.", code)
		if code:
			# The code itself is the full mock JSON response for the access_token URL.
			return build_response(code)
		else:
			log.error("Access token request missing code parameter %r.", url)

	elif url == "https://api.github.com/graphql":
		return build_response(json.dumps({
			"data": {
				"viewer": {
					"uid": "github-uid",
					"db_id": 42,
					"login": "github-login",
					"avatarUrl": "github-avatar-url",
					"email": "github-email",
				},
			},
		}))

	elif url == "https://api.github.com/user/emails":
		return build_response(json.dumps([
			{
				"email": "dummy_user@localhost",
				"verified": True,
				"primary": True,
			},
		]))

	return original_request_fn(*args, **kwargs)


def build_response(content):
	response = requests.Response()
	response.status_code = 200
	response.headers["Content-Type"] = "application/json"
	response.encoding = "utf-8"
	response._content = content.encode()
	return response


def main():
	global original_request_fn
	original_request_fn = requests.Session.request
	requests.Session.request = mocked_request_fn

	del sys.argv[0]
	execute_from_command_line(sys.argv)


if __name__ == '__main__':
	main()
