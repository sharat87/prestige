from django.core.exceptions import ValidationError


class MaximumLengthValidator:
	def __init__(self, max_length=72):
		self.max_length = max_length

	def validate(self, password, user=None):
		if len(password) > 72:
			raise ValidationError(
				"This password must not be longer than %(max_length)d characters in lenght.",
				code='password_too_long',
				params={'max_length': self.max_length},
			)

	def get_help_text(self):
		return "Your password must not be longer than %d characters." % self.max_length
