import json

from django.test import TestCase
from django.urls import reverse


class AnimalTestCase(TestCase):

	def test_standard_get(self):
		response = self.client.post(
			reverse("index"),
			content_type="application/json",
			data=json.dumps({
				"method": "GET",
				"url": "http://httpbin.org/get?one=two",
				"headers": {},
				"cookies": {},
			}),
		)

		self.assertEqual(response.status_code, 200)

		data = response.json()
		self.assertTrue(data["ok"])
		body = json.loads(data["response"]["body"])
		self.assertEqual(body["args"], {
			"one": "two",
		})

	def test_get_missing_input_fields(self):
		response = self.client.post(
			reverse("index"),
			content_type="application/json",
			data=json.dumps({
				"url": "http://httpbin.org/get?one=two",
			}),
		)

		self.assertEqual(response.status_code, 200)

		data = response.json()
		self.assertTrue(data["ok"])
		body = json.loads(data["response"]["body"])
		self.assertEqual(body["args"], {
			"one": "two",
		})

	def test_include_cookies(self):
		response = self.client.post(
			reverse("index"),
			content_type="application/json",
			data=json.dumps({
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
			}),
		)

		self.assertEqual(response.status_code, 200)

		data = response.json()
		self.assertTrue(data["ok"])
		body = json.loads(data["response"]["body"])
		self.assertTrue(body["cookies"])
