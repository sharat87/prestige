import json
from http import HTTPStatus

from django.test import SimpleTestCase
from django.urls import reverse

APPLICATION_JSON = "application/json"


class JobMixin:
	def job(self, job):
		if hasattr(self, "client"):
			return self.client.post(
				reverse("index"),
				content_type=APPLICATION_JSON,
				data=json.dumps(job),
			)

		raise ValueError("No `self.client` to run a job with.")


class MessedUpInput(SimpleTestCase, JobMixin):
	def test_invalid_json(self):
		response = self.client.post(
			reverse("index"),
			content_type=APPLICATION_JSON,
			data="invalid json here",
		)

		self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)

	def test_missing_optional_input_fields(self):
		response = self.job({
			"url": "http://httpbun.org/get?one=two",
		})

		self.assertEqual(response.status_code, HTTPStatus.OK)

		data = response.json()
		body = json.loads(data["response"]["body"])
		self.assertEqual(body["args"], {
			"one": "two",
		})

	def test_missing_url(self):
		response = self.job({})
		self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)
		self.assertEqual(response.json(), {
			"error": {
				"message": "Missing endpoint URL to proxy to.",
			},
		})

	def test_url_numeric(self):
		response = self.job({
			"url": 123,
		})
		self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)
		self.assertEqual(response.json(), {
			"error": {
				"message": "URL should be a string.",
			},
		})


class HttpMethods(SimpleTestCase, JobMixin):
	def test_standard_get(self):
		response = self.job({
			"method": "GET",
			"url": "http://httpbun.org/get?one=two",
			"cookies": {},
		})

		self.assertEqual(response.status_code, HTTPStatus.OK)

		data = response.json()
		body = json.loads(data["response"]["body"])
		self.assertEqual(body["args"], {
			"one": "two",
		})


class MultipartFormDataRequests(SimpleTestCase, JobMixin):
	def test_just_formdata(self):
		response = self.job({
			"method": "POST",
			"url": "http://httpbun.org/post",
			"headers": [
				["content-type", "multipart/form-data"],
			],
			"body": json.dumps({
				"field1": "string value 1",
			}),
			"bodyType": "multipart/form-data",
		})

		self.assertEqual(response.status_code, HTTPStatus.OK)

		data = response.json()
		body = json.loads(data["response"]["body"])
		self.assertEqual(body["args"], {})
		self.assertEqual(body["files"], {})
		self.assertEqual(body["form"], {
			"field1": "string value 1",
		})


class CookieTests(SimpleTestCase, JobMixin):

	def test_include_cookies(self):
		response = self.job({
			"url": "http://httpbun.org/cookies",
			"cookies": {
				"httpbun.org": {
					"/cookies": {
						"three": {
							"value": "three-value",
						},
					},
				},
			},
		})

		self.assertEqual(response.status_code, HTTPStatus.OK)

		data = response.json()
		body = json.loads(data["response"]["body"])
		self.assertEqual(body["cookies"], {
			"three": "three-value",
		})

	def test_cookies_in_response(self):
		response = self.job({
			"url": "http://httpbun.org/cookies/set?first=first-value",
		})

		self.assertEqual(response.status_code, HTTPStatus.OK)

		data = response.json()
		body = json.loads(data["response"]["body"])
		self.assertEqual(body["cookies"], {
			"first": "first-value",
		})
