from http import HTTPStatus
from urllib.parse import urlparse, parse_qs

from django.test import TestCase
from django.urls import reverse


class GitHubOauthTests(TestCase):

	def test_redirect_authorize(self):
		with self.settings(GITHUB_CLIENT_ID="gh-cid"):
			response = self.client.get(reverse("github_auth"))

		self.assertEqual(response.status_code, HTTPStatus.FOUND)

		location = urlparse(response.headers.get("Location"))
		self.assertTrue(location.scheme, "https")
		self.assertTrue(location.hostname, "github.com")
		self.assertTrue(location.path, "/login/oauth/authorize")

		params = parse_qs(location.query)
		self.assertEqual(params["client_id"], ["gh-cid"])
		self.assertEqual(set(" ".join(params["scope"]).split()), {"read:user", "user:email", "gist"})
		self.assertEqual(len(params["state"]), 1)
