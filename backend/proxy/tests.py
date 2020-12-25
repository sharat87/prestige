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
			"url": "http://httpbin.org/get?one=two",
		})

		self.assertEqual(response.status_code, HTTPStatus.OK)

		data = response.json()
		self.assertTrue(data["ok"])
		body = json.loads(data["response"]["body"])
		self.assertEqual(body["args"], {
			"one": "two",
		})

	def test_missing_url(self):
		response = self.job({})

		self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)

		self.assertEqual(response.json(), {})


class HttpMethods(SimpleTestCase, JobMixin):
	def test_standard_get(self):
		response = self.job({
			"method": "GET",
			"url": "http://httpbin.org/get?one=two",
			"headers": {},
			"cookies": {},
		})

		self.assertEqual(response.status_code, HTTPStatus.OK)

		data = response.json()
		self.assertTrue(data["ok"])
		body = json.loads(data["response"]["body"])
		self.assertEqual(body["args"], {
			"one": "two",
		})


class CookieTests(SimpleTestCase, JobMixin):

	def test_include_cookies(self):
		response = self.job({
			"url": "http://httpbin.org/cookies",
			"cookies": {
				"httpbin.org": {
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
		self.assertTrue(data["ok"])
		body = json.loads(data["response"]["body"])
		self.assertEqual(body["cookies"], {
			"three": "three-value",
		})

	def test_cookies_in_response(self):
		response = self.job({
			"url": "http://httpbin.org/cookies/set?first=first-value",
		})

		self.assertEqual(response.status_code, HTTPStatus.OK)

		data = response.json()
		self.assertTrue(data["ok"])
		body = json.loads(data["response"]["body"])
		self.assertEqual(body["cookies"], {
			"first": "first-value",
		})
