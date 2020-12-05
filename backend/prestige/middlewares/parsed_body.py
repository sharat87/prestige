import json


ALLOWED_METHODS = {"GET", "POST", "PATCH", "PUT"}


class ParsedBodyMiddleware:
	def __init__(self, get_response):
		self.get_response = get_response

	def __call__(self, request):
		request.parsed_body = None

		if request.method in ALLOWED_METHODS and 'application/json' in request.META['CONTENT_TYPE']:
			request.parsed_body = data = json.loads(request.body)

			if request.method == 'GET':
				request.GET = data

			elif request.method == 'POST':
				request.POST = data

		return self.get_response(request)
