from django.http import JsonResponse
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
		"ok": True,
		"name": document.name,
		"slug": document.slug,
		"body": document.body,
	})


@require_http_methods(["PATCH"])
@login_required_json
@csrf_exempt
def patch_view(request, slug: str):
	document = get_object_or_404(Document, user=request.user, slug=slug)
	is_changed = False

	if "body" in request.parsed_body and request.parsed_body["body"] != document.body:
		document.body = request.parsed_body["body"]
		is_changed = True

	if is_changed:
		document.save()

	return JsonResponse({
		"ok": True,
	})
