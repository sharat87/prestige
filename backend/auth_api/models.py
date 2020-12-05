from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


# TODO: Use the model from <https://docs.djangoproject.com/en/3.1/topics/auth/customizing/#a-full-example>.
class User(AbstractUser):
	email = models.EmailField(_('email address'), unique=True)
