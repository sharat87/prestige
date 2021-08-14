import json
from http import HTTPStatus

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

APPLICATION_JSON = "application/json"


class SignupTests(TestCase):
	fixtures = ["users.json"]

	def test_signup_valid(self):
		response = self.client.post(
			reverse("signup"),
			content_type=APPLICATION_JSON,
			data=json.dumps({
				"email": "new1@host.com",
				"password": "new1-password",
			})
		)

		self.assertEqual(response.status_code, HTTPStatus.CREATED)
		self.assertEqual(get_user_model().objects.filter(email="new1@host.com").count(), 1)

	def test_signup_duplicate_email(self):
		response = self.client.post(
			reverse("signup"),
			content_type=APPLICATION_JSON,
			data=json.dumps({
				"email": "u1@host.com",
				"password": "u1-duplicate-password",
			})
		)

		self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)
		self.assertEqual(response.json(), {
			"error": {
				"message": "This email already has an account.",
			},
		})

	def test_signup_duplicate_username(self):
		response = self.client.post(
			reverse("signup"),
			content_type=APPLICATION_JSON,
			data=json.dumps({
				"email": "u1_new@host.com",
				"password": "u1-new-password",
				"username": "u1",
			}),
		)

		self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)
		self.assertEqual(response.json(), {
			"error": {
				"message": "This username already has an account.",
			},
		})

	def test_missing_email(self):
		response = self.client.post(
			reverse("signup"),
			content_type=APPLICATION_JSON,
			data=json.dumps({
				"password": "new-password",
			}),
		)

		self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)
		self.assertEqual(response.json(), {
			"error": {
				"message": "Missing/empty email field in body.",
			},
		})
		self.assertEqual(get_user_model().objects.filter(email="new1@host.com").count(), 0)

	def test_missing_password(self):
		response = self.client.post(
			reverse("signup"),
			content_type=APPLICATION_JSON,
			data=json.dumps({
				"email": "new2@host.com",
			}),
		)

		self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)
		self.assertEqual(response.json(), {
			"error": {
				"message": "Missing/empty password field in body.",
			},
		})
		self.assertEqual(get_user_model().objects.filter(email="new2@host.com").count(), 0)

	def test_missing_username(self):
		response = self.client.post(
			reverse("signup"),
			content_type=APPLICATION_JSON,
			data=json.dumps({
				"email": "new3@host.com",
				"password": "new-password",
			}),
		)

		self.assertEqual(response.status_code, HTTPStatus.CREATED)
		self.assertEqual(response.json(), {
			'user': {
				'email': 'new3@host.com',
				'username': 'new3@host.com',
				'isGitHubConnected': False,
			},
		})
		self.assertEqual(get_user_model().objects.filter(email="new3@host.com").count(), 1)

	def test_empty_username(self):
		response = self.client.post(
			reverse("signup"),
			content_type=APPLICATION_JSON,
			data=json.dumps({
				"email": "new4@host.com",
				"password": "new-password",
				"username": "",
			}),
		)

		self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)
		self.assertEqual(response.json(), {
			"error": {
				"message": "Empty username field in body.",
			},
		})
		self.assertEqual(get_user_model().objects.filter(email="new4@host.com").count(), 0)
