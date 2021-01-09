import json
from http import HTTPStatus

from django.test import TestCase
from django.urls import reverse

from . import models

APPLICATION_JSON = "application/json"


class ListingTests(TestCase):
	fixtures = ["users.json", "documents.json"]

	def test_ls(self):
		self.client.login(email="u1@host.com", password="u1-password")
		response = self.client.get(reverse("crud"))

		self.assertEqual(response.status_code, HTTPStatus.OK)
		self.assertEqual(response.json(), {
			"entries": [
				{
					"name": "First's One",
					"slug": "one",
				},
				{
					"name": "First's Two",
					"slug": "two",
				},
			],
		})

	def test_ls_without_login(self):
		response = self.client.get(reverse("crud"))
		self.assertEqual(response.status_code, HTTPStatus.UNAUTHORIZED)
		self.assertEqual(response.json(), {})


class DocumentGettingTests(TestCase):
	fixtures = ["users.json", "documents.json"]

	def test_get(self):
		self.client.login(email="u1@host.com", password="u1-password")
		response = self.client.get(reverse("crud_single", kwargs={"slug": "one"}))

		self.assertEqual(response.status_code, HTTPStatus.OK)
		self.assertEqual(response.json(), {
			"body": "First one's body",
		})

	def test_get_without_login(self):
		response = self.client.get(reverse("crud_single", kwargs={"slug": "one"}))
		self.assertEqual(response.status_code, HTTPStatus.UNAUTHORIZED)
		self.assertEqual(response.json(), {})

	def test_get_different_user(self):
		self.client.login(email="u1@host.com", password="u1-password")
		response = self.client.get(reverse("crud_single", kwargs={"slug": "2-one"}))
		self.assertEqual(response.status_code, HTTPStatus.NOT_FOUND)

	def test_get_missing_doc(self):
		self.client.login(email="u1@host.com", password="u1-password")
		response = self.client.get(reverse("crud_single", kwargs={"slug": "missing-document"}))
		self.assertEqual(response.status_code, HTTPStatus.NOT_FOUND)


class PatchTests(TestCase):
	fixtures = ["users.json", "documents.json"]

	def run_patch(self, slug, **kwargs):
		return self.client.patch(
			reverse("crud_single", kwargs={"slug": slug}),
			content_type=APPLICATION_JSON,
			data=json.dumps(kwargs),
		)

	def test_patch_body(self):
		self.client.login(email="u1@host.com", password="u1-password")
		response = self.run_patch("one", body="changed body")
		self.assertEqual(response.status_code, HTTPStatus.OK)
		self.assertEqual(models.Document.objects.get(slug="one").body, "changed body")

	def test_patch_body_without_login(self):
		response = self.run_patch("one", body="changed body")
		self.assertEqual(response.status_code, HTTPStatus.UNAUTHORIZED)
		self.assertEqual(models.Document.objects.get(slug="one").body, "First one's body")

	def test_patch_body_different_user(self):
		self.client.login(email="u1@host.com", password="u1-password")
		response = self.run_patch("2-one", body="changed body")
		self.assertEqual(response.status_code, HTTPStatus.NOT_FOUND)
		self.assertEqual(models.Document.objects.get(slug="2-one").body, "Second one's body")

	def test_patch_body_missing_doc(self):
		self.client.login(email="u1@host.com", password="u1-password")
		response = self.run_patch("missing-doc-slug", body="changed body")
		self.assertEqual(response.status_code, HTTPStatus.NOT_FOUND)
		self.assertEqual(models.Document.objects.get(slug="2-one").body, "Second one's body")

	def test_patch_name(self):
		self.client.login(email="u1@host.com", password="u1-password")
		response = self.run_patch("one", name="changed name")
		self.assertEqual(response.status_code, HTTPStatus.OK)
		self.assertEqual(models.Document.objects.get(slug="one").name, "changed name")

	def test_patch_name_without_login(self):
		response = self.run_patch("one", name="changed name")
		self.assertEqual(response.status_code, HTTPStatus.UNAUTHORIZED)
		self.assertEqual(models.Document.objects.get(slug="one").name, "First's One")

	def test_patch_name_different_user(self):
		self.client.login(email="u1@host.com", password="u1-password")
		response = self.run_patch("2-one", name="changed name")
		self.assertEqual(response.status_code, HTTPStatus.NOT_FOUND)
		self.assertEqual(models.Document.objects.get(slug="2-one").name, "Second's One")

	def test_patch_name_missing_doc(self):
		self.client.login(email="u1@host.com", password="u1-password")
		response = self.run_patch("missing-doc-slug", name="changed name")
		self.assertEqual(response.status_code, HTTPStatus.NOT_FOUND)
		self.assertEqual(models.Document.objects.get(slug="2-one").name, "Second's One")


class PostTests(TestCase):
	fixtures = ["users.json", "documents.json"]

	def test_valid(self):
		self.client.login(email="u1@host.com", password="u1-password")
		response = self.client.post(
			reverse("crud"),
			content_type=APPLICATION_JSON,
			data=json.dumps({
				"name": "First's new one",
				"body": "First new one's body"
			})
		)

		self.assertEqual(response.status_code, HTTPStatus.CREATED)
		self.assertTrue(response.json()["id"])

		doc = models.Document.objects.get(id=response.json()["id"])
		self.assertEqual(doc.name, "First's new one")
		self.assertEqual(doc.body, "First new one's body")

	def test_without_login(self):
		response = self.client.post(
			reverse("crud"),
			content_type=APPLICATION_JSON,
			data=json.dumps({
				"name": "First's new one",
				"body": "First new one's body"
			})
		)

		self.assertEqual(response.status_code, HTTPStatus.UNAUTHORIZED)
		self.assertEqual(response.json(), {})

	def test_duplicate_name(self):
		self.client.login(email="u1@host.com", password="u1-password")
		response = self.client.post(
			reverse("crud"),
			content_type=APPLICATION_JSON,
			data=json.dumps({
				"name": "First's One",
				"body": "First new one's body"
			})
		)

		self.assertEqual(response.status_code, HTTPStatus.CONFLICT)
		self.assertEqual(response.json(), {
			"error": {
				"messages": "There's already a document by that name. Please use a different name.",
			},
		})
		# TODO: Verify that no new document objects were created.

	def test_missing_name(self):
		self.client.login(email="u1@host.com", password="u1-password")
		response = self.client.post(
			reverse("crud"),
			content_type=APPLICATION_JSON,
			data=json.dumps({
				"body": "First new one's body",
			})
		)

		self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)
		self.assertEqual(response.json(), {
			"error": {
				"message": "Missing name in payload.",
			},
		})

	def test_invalid_name(self):
		self.client.login(email="u1@host.com", password="u1-password")
		response = self.client.post(
			reverse("crud"),
			content_type=APPLICATION_JSON,
			data=json.dumps({
				"name": [
					"Name can't be a list!"
				],
				"body": "First new one's body",
			})
		)

		self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)
		self.assertEqual(response.json(), {
			"error": {
				"message": "Invalid value for name.",
			},
		})

	def test_missing_body(self):
		self.client.login(email="u1@host.com", password="u1-password")
		response = self.client.post(
			reverse("crud"),
			content_type=APPLICATION_JSON,
			data=json.dumps({
				"name": "New with no body",
			})
		)

		self.assertEqual(response.status_code, HTTPStatus.CREATED)

		doc = models.Document.objects.get(id=response.json()["id"])
		self.assertEqual(doc.name, "New with no body")
		self.assertEqual(doc.body, "")

	def test_invalid_body(self):
		self.client.login(email="u1@host.com", password="u1-password")
		response = self.client.post(
			reverse("crud"),
			content_type=APPLICATION_JSON,
			data=json.dumps({
				"name": "New name",
				"body": [
					"The body shouldn't be a list!"
				],
			})
		)

		self.assertEqual(response.status_code, HTTPStatus.BAD_REQUEST)
		self.assertEqual(response.json(), {
			"error": {
				"message": "Invalid value for body.",
			},
		})

	# def test_extra_unknown_fields(self):


class DeleteTests(TestCase):
	def test_valid(self):
		self.client.login(email="u1@host.com", password="u1-password")
		response = self.client.delete(
			reverse("crud_single", kwargs={"slug": "one"}),
		)

		self.assertEqual(response.status_code, HTTPStatus.NO_CONTENT)
