import json

from django.test import TestCase
from django.urls import reverse

APPLICATION_JSON = "application/json"


class AnimalTestCase(TestCase):

	def job(self, job):
		return self.client.post(
			reverse("index"),
			content_type=APPLICATION_JSON,
			data=json.dumps(job),
		)

	def test_standard_get(self):
		response = self.job({
			"method": "GET",
			"url": "http://httpbin.org/get?one=two",
			"headers": {},
			"cookies": {},
		})

		self.assertEqual(response.status_code, 200)

		data = response.json()
		self.assertTrue(data["ok"])
		body = json.loads(data["response"]["body"])
		self.assertEqual(body["args"], {
			"one": "two",
		})

	def test_get_missing_input_fields(self):
		response = self.job({
			"url": "http://httpbin.org/get?one=two",
		})

		self.assertEqual(response.status_code, 200)

		data = response.json()
		self.assertTrue(data["ok"])
		body = json.loads(data["response"]["body"])
		self.assertEqual(body["args"], {
			"one": "two",
		})

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

		self.assertEqual(response.status_code, 200)

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

		self.assertEqual(response.status_code, 200)

		data = response.json()
		self.assertTrue(data["ok"])
		body = json.loads(data["response"]["body"])
		self.assertEqual(body["cookies"], {
			"first": "first-value",
		})
