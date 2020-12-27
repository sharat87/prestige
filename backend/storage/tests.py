from http import HTTPStatus

from django.test import TestCase
from django.urls import reverse


class SpikeTest(TestCase):
	fixtures = ["users.json", "documents.json"]

	def test_ls(self):
		self.client.login(email="u1@host.com", password="u1-password")
		response = self.client.get(reverse("ls_view"))

		self.assertEqual(response.status_code, HTTPStatus.OK)
		self.assertEqual(response.json(), {
			"entries": [
				{
					"name": "one",
					"slug": "one",
				},
				{
					"name": "two",
					"slug": "two",
				},
			],
		})

	def test_ls_without_login(self):
		response = self.client.get(reverse("ls_view"))

		self.assertEqual(response.status_code, HTTPStatus.UNAUTHORIZED)
		self.assertEqual(response.json(), {
			"error": {
				"message": "You need to be logged in to access this.",
			},
		})
