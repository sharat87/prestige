import json
import logging
from http import HTTPStatus

from django.test import TestCase
from django.urls import reverse


APPLICATION_JSON = "application/json"


class LoginTests(TestCase):
	fixtures = ["users.json"]

	def setUp(self) -> None:
		self.u1_email = "u1@host.com"
		self.u1_password = "u1-password"

	def test_login_valid_urlencoded(self):
		response = self.client.post(
			reverse("login"),
			content_type="application/x-www-form-urlencoded",
			data=f"email={self.u1_email}&password={self.u1_password}",
		)

		self.assertEqual(response.status_code, HTTPStatus.OK)

	def test_login_valid_json(self):
		response = self.client.post(
			reverse("login"),
			content_type=APPLICATION_JSON,
			data=json.dumps({
				"email": self.u1_email,
				"password": self.u1_password,
			}),
		)

		self.assertEqual(response.status_code, HTTPStatus.OK)
		self.assertEqual(response.json(), {
			"user": {
				"username": "u1",
				"email": self.u1_email,
			},
		})

	def test_login_incorrect_password(self):
		response = self.client.post(
			reverse("login"),
			content_type=APPLICATION_JSON,
			data=json.dumps({
				"email": self.u1_email,
				"password": "incorrect-password",
			}),
		)

		self.assertEqual(response.status_code, HTTPStatus.UNAUTHORIZED)
		self.assertEqual(response.json(), {})

	def test_login_missing_email(self):
		response = self.client.post(
			reverse("login"),
			content_type=APPLICATION_JSON,
			data=json.dumps({
				"password": self.u1_password,
			}),
		)

		self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)
		self.assertEqual(response.json(), {})

	def test_login_missing_password(self):
		response = self.client.post(
			reverse("login"),
			content_type=APPLICATION_JSON,
			data=json.dumps({
				"email": self.u1_email,
			}),
		)

		self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)
		self.assertEqual(response.json(), {})

	def test_login_invalid_email(self):
		response = self.client.post(
			reverse("login"),
			content_type=APPLICATION_JSON,
			data=json.dumps({
				"email": [
					"email can't be a list, it should be a string!"
				],
				"password": "incorrect-password",
			}),
		)

		self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)
		self.assertEqual(response.json(), {})

	def test_login_invalid_password(self):
		response = self.client.post(
			reverse("login"),
			content_type=APPLICATION_JSON,
			data=json.dumps({
				"email": self.u1_email,
				"password": [
					"password can't be a list, it should be a string!"
				],
			}),
		)

		self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)
		self.assertEqual(response.json(), {})
