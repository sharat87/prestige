from functools import wraps

from django.http import JsonResponse


def login_required_json(view_fn):
	@wraps(view_fn)
	def login_required_json_wrapper(request, *args, **kwargs):
		return view_fn(request, *args, **kwargs) if request.user.is_authenticated else JsonResponse(status=403, data={
			"ok": False,
			"error": {
				"message": "You need to be logged in to access this.",
			},
		})

	return login_required_json_wrapper
