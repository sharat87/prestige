from functools import wraps
from http import HTTPStatus

from django.http import JsonResponse


def login_required_json(view_fn):
	@wraps(view_fn)
	def login_required_json_wrapper(request, *args, **kwargs):
		return view_fn(request, *args, **kwargs) if request.user.is_authenticated else JsonResponse(
			status=HTTPStatus.UNAUTHORIZED,
			data={
				"code": "require-login",
				"message": "This endpoint requires you to be logged in.",
			},
		)

	return login_required_json_wrapper
