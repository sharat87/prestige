from http import HTTPStatus

from django.test import TestCase
from django.urls import reverse


class ListingTests(TestCase):
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
		self.assertEqual(response.json(), {})


class DocumentGettingTests(TestCase):
	fixtures = ["users.json", "documents.json"]

	def test_get(self):
		self.client.login(email="u1@host.com", password="u1-password")
		response = self.client.get(reverse("get_view", kwargs={"slug": "one"}))

		self.assertEqual(response.status_code, HTTPStatus.OK)
		self.assertEqual(response.json(), {
			"body": "GET http://httpbin.org/get",
		})

	def test_get_without_login(self):
		response = self.client.get(reverse("get_view", kwargs={"slug": "one"}))
		self.assertEqual(response.status_code, HTTPStatus.UNAUTHORIZED)
		self.assertEqual(response.json(), {})

	def test_get_belonging_to_other_user(self):
		self.client.login(email="u1@host.com", password="u1-password")
		response = self.client.get(reverse("get_view", kwargs={"slug": "2-one"}))
		self.assertEqual(response.status_code, HTTPStatus.NOT_FOUND)

	def test_get_missing_doc(self):
		self.client.login(email="u1@host.com", password="u1-password")
		response = self.client.get(reverse("get_view", kwargs={"slug": "missing-document"}))
		self.assertEqual(response.status_code, HTTPStatus.NOT_FOUND)
