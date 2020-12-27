from http import HTTPStatus

from django.http import JsonResponse, HttpResponseNotFound
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from auth_api.utils import login_required_json
from .models import Document


class DocumentCrud(View):
	http_method_names = ["get", "post", "patch", "delete", "head", "options", "trace"]

	@method_decorator(login_required_json)
	@method_decorator(csrf_exempt)
	def dispatch(self, request, *args, **kwargs):
		return super().dispatch(request, *args, **kwargs)

	@classmethod
	def get(cls, request, *args, slug: str = None, **kwargs):
		if slug:
			return cls.single(request, slug)
		else:
			return cls.listing(request)

	@staticmethod
	def listing(request):
		return JsonResponse({
			"entries": list(request.user.document_set.values("name", "slug")),
		})

	@staticmethod
	def single(request, slug):
		document = get_object_or_404(Document, user=request.user, slug=slug)
		return JsonResponse({
			"body": document.body,
		})

	@staticmethod
	def patch(request, *args, slug: str = None, **kwargs):
		updates = {}

		body = request.parsed_body.get("body")
		if body is not None:
			if not isinstance(body, str):
				return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Invalid body", data={})
			updates["body"] = body

		name = request.parsed_body.get("name")
		if name is not None:
			if not isinstance(name, str):
				return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Invalid name", data={})
			updates["name"] = name

		if not updates:
			return JsonResponse(status=HTTPStatus.BAD_REQUEST, reason="Nothing to patch", data={})

		count = Document.objects.filter(user=request.user, slug=slug).update(**updates)
		return JsonResponse({}) if count else HttpResponseNotFound()
