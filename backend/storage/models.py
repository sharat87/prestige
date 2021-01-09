from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models


SLUG_VALIDATOR = RegexValidator(
	regex=r"^[-a-z0-9]+$",
	message="Slug can only contain lower case letters, numbers or `-`.",
)

IdentifierValidator = RegexValidator(
	regex=r"^[-_a-zA-Z0-9]+$",
	message="Name has to be a valid identifier and so can only contain alphanumerics, hyphen and underscore characters.",
)


class Document(models.Model):
	user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE)
	name = models.CharField(max_length=200, validators=[IdentifierValidator])
	slug = models.CharField(max_length=200, validators=[SLUG_VALIDATOR])
	body = models.TextField()
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = [
			("user", "name"),
			("user", "slug"),
		]

	def __str__(self):
		return self.name

	def __repr__(self):
		return f'Document(user="{self.user}", name="{self.name}")'
