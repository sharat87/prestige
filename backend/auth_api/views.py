import logging
from http import HTTPStatus

from django.contrib import auth
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.db import IntegrityError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET

from .utils import login_required_json


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

	return JsonResponse(status=HTTPStatus.CREATED, data={})


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
	return JsonResponse({
		"user": user_plain(request.user) if request.user.is_authenticated else None,
	})


def user_plain(user: AbstractUser):
	return {
		"username": user.username,
		"email": user.email,
	}
