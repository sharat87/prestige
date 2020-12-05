from django.contrib import auth
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET

from .utils import login_required_json


@require_POST
@csrf_exempt
def signup_view(request):
	email: str = request.POST["email"]
	password: str = request.POST["password"]
	username: str = email  # The email field doesn't have a unique constraint, but username does.

	user = get_user_model().objects.create_user(username, password, email=email or None)
	if user is None:
		return JsonResponse({
			"ok": False,
			"error": {
				"message": "Signup failed",
			},
		})

	auth.login(request, user)

	return JsonResponse({
		"ok": True,
		"user": user_plain(request.user),
	})


@require_POST
@csrf_exempt
def login_view(request):
	username = request.POST["email"]
	password = request.POST["password"]

	user = auth.authenticate(request, username=username, password=password)
	if user is None:
		return JsonResponse({
			"ok": False,
			"error": {
				"message": "Login failed",
			},
		})

	auth.login(request, user)

	return JsonResponse({
		"ok": True,
		"user": user_plain(request.user),
	})


@require_POST
@csrf_exempt
def logout_view(request):
	auth.logout(request)
	return JsonResponse({
		"ok": True,
	})


@require_GET
@login_required_json
def profile_view(request):
	return JsonResponse({
		"ok": True,
		"user": user_plain(request.user),
	})


def user_plain(user: AbstractUser):
	return {
		"username": user.username,
		"email": user.email,
	}
