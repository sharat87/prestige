import logging
from http import HTTPStatus
import json
import secrets

import requests
from django.conf import settings
from django.contrib import auth
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.http import HttpResponse, JsonResponse, HttpResponseNotFound
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from django.shortcuts import redirect

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

	recaptcha_token = request.parsed_body.get("recaptchaToken")
	if not recaptcha_token:
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Missing recaptcha token", data={
			"error": {
				"code": "missing-recaptcha-token",
				"message": "Missing reCAPTCHA token. Please try again later.",
			},
		})

	if not isinstance(recaptcha_token, str):
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Invalid recaptcha token", data={
			"error": {
				"code": "invalid-recaptcha-token",
				"message": "Invalid reCAPTCHA token. Must be a string.",
			},
		})

	recaptcha_verify_response = requests.post(
		f"https://recaptchaenterprise.googleapis.com/v1beta1/projects/{settings.RECAPTCHA_PROJECT_ID}/assessments",
		params={
			"key": settings.RECAPTCHA_API_KEY,
		},
		json={
			"event": {
				"token": recaptcha_token,
				"siteKey": settings.RECAPTCHA_SITE_KEY,
				"expectedAction": "SIGNUP",
			},
		},
	)
	recaptcha_verify_response.raise_for_status()

	recaptcha_verify_response_data = recaptcha_verify_response.json()
	log.info("recaptcha assessment response %r", recaptcha_verify_response_data)
	if not recaptcha_verify_response_data["tokenProperties"]["valid"]:
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Recaptcha validation fail", data={
			"error": {
				"code": "recaptcha-validation-failed",
				"message": "The reCAPTCHA validation failed. Something's up!",
			},
		})

	if (
		recaptcha_verify_response_data["tokenProperties"]["action"]
		!= recaptcha_verify_response_data["event"]["expectedAction"]
	):
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Recaptcha validation fail", data={
			"error": {
				"code": "recaptcha-action-mismatch",
				"message": "The reCAPTCHA action is unexpected. Something's definitely up!",
			},
		})

	user_model = get_user_model()

	try:
		user = user_model.objects.create_user(username=username, email=email, password=password)
	except IntegrityError as error:
		message = str(error)
		if message.startswith("UNIQUE constraint failed: "):
			field_name = message.split(".")[-1]
			# TODO: Instead of telling the user the there is a duplicate record, just say unknown error, and send an
			# email alert that they already have an account, and they should login.
			return JsonResponse(status=HTTPStatus.BAD_REQUEST, data={
				"error": {
					"code": f"{field_name}-duplicate",
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


def user_plain(user):
	return {
		"username": user.username,
		"email": user.email,
		"isGitHubConnected": user.github_ids.exists(),
	}


def github_auth_view(request):
	if not settings.GITHUB_CLIENT_ID:
		return HttpResponseNotFound("Sorry, GitHub Integration not configured on this server")

	state_token = secrets.token_urlsafe(64)
	request.session["github_auth_state_token"] = state_token

	return redirect(
		"https://github.com/login/oauth/authorize?client_id=" + settings.GITHUB_CLIENT_ID +
		"&scope=read:user user:email repo gist"
		"&state=" + state_token
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

	if request.GET.get("state") != request.session.get("github_auth_state_token"):
		log.error("Mismatching state %r %r", request.GET.get("state"), request.session.get("github_auth_state_token"))
		return JsonResponse(status=HTTPStatus.UNAUTHORIZED, reason="State mismatch", data={
			"error": {
				"code": "state-mismatch",
				"message": "Mismatching state found. Rejecting authentication, for your secrurity. Please try agian.",
			},
		})

	request.session.pop("github_auth_state_token", None)
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
	log.info("response from github access token url %r", data)
	access_token = data["access_token"]

	response = requests.post(
		"https://api.github.com/graphql",
		headers={
			"Accept": "application/vnd.github.v3+json",
			"Authorization": "Bearer " + access_token,
		},
		json={
			"query": """
				{
				  viewer {
					db_id: databaseId
					uid: id
					login
					avatarUrl
					email
				  }
				}
			""",
		},
	)
	response.raise_for_status()
	gh_user_response = response.json()
	log.info("graphql user details response %r", gh_user_response)

	if "data" not in gh_user_response:
		return JsonResponse(status=HTTPStatus.INTERNAL_SERVER_ERROR, data={
			"error": {
				"code": "missing-data-in-gist-response",
				"message": "Missing data key in response from Gist API.",
				"details": gh_user_response,
			},
		})

	gh_user_response = gh_user_response["data"]["viewer"]
	github_user_id = gh_user_response["uid"]

	# The GraphQL API doesn't give any email information. So we have to do another REST query for that.
	response = requests.get(
		"https://api.github.com/user/emails",
		headers={
			"Authorization": "token " + access_token,
		},
	)
	response.raise_for_status()

	log.info("email details from github %r", response.json())
	email_details = next(item for item in response.json() if item["primary"])

	if not email_details["verified"]:
		return JsonResponse(status=HTTPStatus.UNAUTHORIZED, data={
			"error": {
				"code": "github-email-not-verified",
				"message": "Primary email not verified on GitHub.",
			},
		})

	try:
		# TODO: What happens where there's multiple users with this github user id?
		user = GitHubIdentity.objects.get(uid=github_user_id).user
	except GitHubIdentity.DoesNotExist:
		user = None
	log.info("user for github user uid %r is %r", github_user_id, user)

	updates = {
		"db_id": gh_user_response["db_id"],
		"access_token": GitHubIdentity.encrypt_access_token(access_token),
		"user_handle": gh_user_response["login"],
		"avatar_url": gh_user_response["avatarUrl"],
	}

	if user is None:
		user_model = get_user_model()
		email = email_details["email"]

		try:
			user = user_model.objects.get(email=email)
		except user_model.DoesNotExist:
			user = user_model.objects.create_user(username=email, email=email, password=None)

		GitHubIdentity.objects.create(user=user, uid=github_user_id, **updates)

	else:
		GitHubIdentity.objects.filter(user=user).update(**updates)

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
