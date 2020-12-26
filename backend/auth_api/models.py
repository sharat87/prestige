from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models


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
