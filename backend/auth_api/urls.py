from django.conf import settings
from django.urls import path

from . import views

urlpatterns = [
	path("signup", views.signup_view, name="signup"),
	path("login", views.login_view, name="login"),
	path("logout", views.logout_view, name="logout"),
	path("profile", views.profile_view, name="profile"),
]

if settings.GITHUB_CLIENT_ID:
	urlpatterns += [
		path("github", views.github_auth_view, name="github_auth"),
		path("github/callback", views.github_auth_callback_view, name="github_auth_callback"),
	]
