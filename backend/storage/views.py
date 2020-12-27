from http import HTTPStatus

from django.http import JsonResponse, HttpResponseNotFound
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from auth_api.utils import login_required_json
from .models import Document


@require_GET
@login_required_json
def ls_view(request):
	return JsonResponse({
		"entries": list(request.user.document_set.values("name", "slug")),
	})


@require_GET
@login_required_json
def get_view(request, slug: str):
	document = get_object_or_404(Document, user=request.user, slug=slug)
	return JsonResponse({
		"body": document.body,
	})


@require_http_methods(["PATCH"])
@login_required_json
@csrf_exempt
def patch_view(request, slug: str):
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
	if count:
		return JsonResponse({})
	else:
		return HttpResponseNotFound()
