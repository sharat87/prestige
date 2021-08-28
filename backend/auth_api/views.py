import logging
from http import HTTPStatus
import json

import requests
from django.conf import settings
from django.contrib import auth
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.db import IntegrityError
from django.http import HttpResponse, JsonResponse, HttpResponseNotFound
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from django.shortcuts import redirect

from .utils import login_required_json
from .models import GitHubIdentity


log = logging.getLogger(__name__)


@require_POST
@csrf_exempt
def signup_view(request):
	email: str = request.parsed_body.get("email")
	if not email:
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Missing email", data={
			"error": {
				"message": "Missing/empty email field in body.",
			},
		})

	if not isinstance(email, str):
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Invalid email", data={
			"error": {
				"message": "Invalid email value. Must be a string.",
			},
		})

	password: str = request.parsed_body.get("password")
	if not password:
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Missing password", data={
			"error": {
				"message": "Missing/empty password field in body.",
			},
		})

	if not isinstance(password, str):
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Invalid password", data={
			"error": {
				"message": "Invalid password value. Must be a string.",
			},
		})

	username: str = request.parsed_body.get("username", email)
	if not username:
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Missing username", data={
			"error": {
				"message": "Empty username field in body.",
			},
		})

	if not isinstance(username, str):
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Invalid username", data={
			"error": {
				"message": "Invalid username value. Must be a string.",
			},
		})

	user_model = get_user_model()

	try:
		user = user_model.objects.create_user(username=username, email=email, password=password)
	except IntegrityError as error:
		message = str(error)
		if message.startswith("UNIQUE constraint failed: "):
			field_name = message.split(".")[-1]
			return JsonResponse(status=HTTPStatus.BAD_REQUEST, data={
				"error": {
					"message": f"This {field_name} already has an account.",
				},
			})
		raise

	auth.login(request, user)

	return JsonResponse(status=HTTPStatus.CREATED, data={
		"user": user_plain(user),
	})


@require_POST
@csrf_exempt
def login_view(request):
	email = request.parsed_body.get("email")
	if not email:
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Missing email", data={})

	if not isinstance(email, str):
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Invalid email", data={})

	password = request.parsed_body.get("password")
	if not password:
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Missing password", data={})

	if not isinstance(password, str):
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Invalid password", data={})

	user = auth.authenticate(request, email=email, password=password)
	if user is None:
		return JsonResponse(status=HTTPStatus.UNAUTHORIZED, reason="Login failed", data={})

	auth.login(request, user)

	return JsonResponse({
		"user": user_plain(request.user),
	})


@require_POST
@csrf_exempt
def logout_view(request):
	auth.logout(request)
	return JsonResponse({})


@require_GET
def profile_view(request):
	user = request.user
	return JsonResponse({
		"user": user_plain(user) if user.is_authenticated else None,
	})


def user_plain(user: AbstractUser):
	return {
		"username": user.username,
		"email": user.email,
		"isGitHubConnected": user.github_ids.exists(),
	}


def github_auth_view(request):
	if not settings.GITHUB_CLIENT_ID:
		return HttpResponseNotFound("Sorry, GitHub Integration not configured on this server")

	# TODO: Include state verification.
	return redirect(
		"https://github.com/login/oauth/authorize?client_id=" + settings.GITHUB_CLIENT_ID +
		"&scope=read:user user:email repo gist"
	)


def github_auth_callback_view(request):
	if not settings.GITHUB_CLIENT_ID:
		return HttpResponseNotFound("Sorry, GitHub Integration not configured on this server")

	error = request.GET.get("error")

	if error == "access_denied":
		# The user clicked on "Cancel" instead of "Authorize".
		# ?error=access_denied&error_description=The+user+has+denied+your+application+access.&error_uri=https%3A%2F%2Fdocs.github.com%2Fapps%2Fmanaging-oauth-apps%2Ftroubleshooting-authorization-request-errors%2F%23access-denied
		return js_message_response(False, error=error)

	if error is not None:
		return JsonResponse(status=HTTPStatus.UNAUTHORIZED, reason=error, data={})

	code = request.GET.get("code")

	if not code:
		return JsonResponse(status=HTTPStatus.UNAUTHORIZED, reason="Missing OAuth code", data={})

	response = requests.post(
		"https://github.com/login/oauth/access_token",
		params={
			"client_id": settings.GITHUB_CLIENT_ID,
			"client_secret": settings.GITHUB_CLIENT_SECRET,
			"code": code,
		},
		headers={
			"Accept": "application/json",
		},
	)
	response.raise_for_status()

	data = response.json()
	# Sample: {"access_token":"gho_16C7e42F292c6912E7710c838347Ae178B4a", "scope":"repo,gist", "token_type":"bearer"}
	log.info("response from github access token url", data)
	access_token = data["access_token"]

	response = requests.get(
		"https://api.github.com/user",
		headers={
			"Authorization": "token " + access_token,
		},
	)
	response.raise_for_status()

	log.info("user details from github %r", response.json())
	github_user_id = str(response.json()["id"])

	response = requests.get(
		"https://api.github.com/user/emails",
		headers={
			"Authorization": "token " + data["access_token"],
		},
	)
	response.raise_for_status()

	log.info("email details from github %r", response.json())
	email_details = next(item for item in response.json() if item["primary"])
	email = email_details["email"]

	user_model = get_user_model()

	try:
		# TODO: What happens where there's multiple users with this github user id?
		user = GitHubIdentity.objects.get(uid=github_user_id).user
	except GitHubIdentity.DoesNotExist:
		user = None
	log.info("user for github user id %r is %r", github_user_id, user)

	if user is None:
		email_is_verified = email_details["verified"]

		if not email_is_verified:
			return JsonResponse(status=HTTPStatus.UNAUTHORIZED, data={
				"error": {
					"code": "github-email-not-verified",
					"message": "Primary email not verified on GitHub.",
				},
			})

		try:
			user = user_model.objects.get(email=email)
		except user_model.DoesNotExist:
			user = user_model.objects.create_user(username=email, email=email, password=None)

		GitHubIdentity.objects.create(user=user, uid=github_user_id, access_token=access_token)

	else:
		GitHubIdentity.objects.filter(user=user).update(access_token=access_token)

	auth.login(request, user)

	return js_message_response(True)


def js_message_response(is_approved: bool, error: str = None) -> HttpResponse:
	data = {
		"type": "oauth",
		"provider": "github",
		"isApproved": is_approved,
		"error": error,
	}

	return HttpResponse(content="""<!doctype html>
	<title>Prestige</title>
	<h1>Finished. This window should close.</h1>
	<script>
	// TODO: Specify the incoming Origin here, instead of `*`.
	// See <https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage>
	window.opener.postMessage(%s, location.origin);
	window.close();
	</script>
	""" % json.dumps(data))
