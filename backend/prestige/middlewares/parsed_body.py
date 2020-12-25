import json
from http import HTTPStatus

from django.http import JsonResponse

ALLOWED_METHODS = {"GET", "POST", "PATCH", "PUT"}


class ParsedBodyMiddleware:
	def __init__(self, get_response):
		self.get_response = get_response

	def __call__(self, request):
		request.parsed_body = None

		if request.method in ALLOWED_METHODS and "application/json" in request.META["CONTENT_TYPE"]:
			try:
				request.parsed_body = json.loads(request.body)
			except json.JSONDecodeError as error:
				return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Invalid JSON in body", data={
					"error": {
						"message": str(error),
					},
				})

		elif request.method == 'GET':
			request.parsed_body = request.GET

		elif request.method == 'POST':
			request.parsed_body = request.POST

		return self.get_response(request)
