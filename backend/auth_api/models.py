import base64

from django.conf import settings
from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models
from cryptography.fernet import Fernet


ACCESS_TOKEN_ENCRYPTION = Fernet(settings.ACCESS_TOKEN_ENCRYPTION_KEY)


class CustomUserManager(BaseUserManager):
	def create_user(self, email, username=None, password=None):
		"""
		Creates and saves a User with the given email, date of
		birth and password.
		"""

		user = self.model(
			email=self.normalize_email(email),
			username=username,
		)

		user.set_password(password)
		user.save(using=self._db)
		return user

	def create_superuser(self, email, username=None, password=None):
		"""
		Creates and saves a superuser with the given email, date of
		birth and password.
		"""

		user = self.create_user(
			email,
			username=username,
			password=password,
		)

		user.is_superuser = True
		user.is_staff = True
		user.save(using=self._db)
		return user


class User(AbstractUser):
	email = models.EmailField(max_length=200, unique=True)

	objects = CustomUserManager()

	USERNAME_FIELD = "email"
	REQUIRED_FIELDS = ["username"]


class GitHubIdentity(models.Model):
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="github_ids")
	db_id = models.IntegerField(help_text="The numeric database ID of the user on GitHub")
	uid = models.CharField(max_length=300, help_text="The newer string ID of the user on GitHub")
	access_token = models.CharField(max_length=500)
	user_handle = models.CharField(max_length=400)
	avatar_url = models.CharField(max_length=200, null=True)

	class Meta:
		verbose_name = "GitHub Identity"
		verbose_name_plural = "GitHub Identities"

	def __str__(self):
		return f"{self.user.email} ({self.uid})"

	def plain_access_token(self):
		return ACCESS_TOKEN_ENCRYPTION.decrypt(base64.b64decode(self.access_token.encode())).decode()

	@staticmethod
	def encrypt_access_token(token: str):
		return base64.b64encode(ACCESS_TOKEN_ENCRYPTION.encrypt(token.encode())).decode()
