from http import HTTPStatus

from django.db import IntegrityError
from django.http import JsonResponse, HttpResponseNotFound
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from auth_api.utils import login_required_json
from .models import Document


@require_http_methods(["GET", "POST"])
@login_required_json
@csrf_exempt
def index_view(request):
	method = request.method

	if method == "GET":
		return JsonResponse({
			"entries": list(request.user.document_set.values("name", "slug")),
		})

	elif method == "POST":
		return create_document(request)

	else:
		raise ValueError(f"Unexpected method in request: {request.method}.")


@require_http_methods(["GET", "PATCH", "DELETE"])
@login_required_json
@csrf_exempt
def single_view(request, slug: str):
	method = request.method

	if method == "GET":
		return get_document(request, slug)

	elif method == "PATCH":
		return patch_document(request, slug)

	elif method == "DELETE":
		return delete_document(request, slug)

	else:
		raise ValueError(f"Unexpected method in request: {request.method}.")


def get_document(request, slug: str):
	document = get_object_or_404(Document, user=request.user, slug=slug)
	return JsonResponse({
		"body": document.body,
	})


def patch_document(request, slug: str):
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


def create_document(request):
	if not isinstance(request.parsed_body, dict):
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, data={
			"error": {
				"message": "Invalid request payload.",
			},
		})

	name = request.parsed_body.pop("name", None)

	if not name:
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, data={
			"error": {
				"message": "Missing name in payload.",
			},
		})

	if not isinstance(name, str):
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, data={
			"error": {
				"message": "Invalid value for name.",
			},
		})

	body = request.parsed_body.pop("body", "")

	if not isinstance(body, str):
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, data={
			"error": {
				"message": "Invalid value for body.",
			},
		})

	if request.parsed_body:
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, data={
			"error": {
				"message": "Unknown extra fields: " + ", ".join(map(repr, request.parsed_body.keys())) + ".",
			},
		})

	try:
		document = request.user.document_set.create(name=name, body=body)
	except IntegrityError as error:
		error_message = str(error)
		if ".user_id" in error_message and ".name" in error_message:
			return JsonResponse(status=HTTPStatus.CONFLICT, data={
				"error": {
					"messages": "There's already a document by that name. Please use a different name.",
				},
			})
		raise

	return JsonResponse(status=HTTPStatus.CREATED, data={
		"id": document.id,
	})


def delete_document(request, slug):
	count, _ = request.user.document_set.filter(slug=slug).delete()

	if not count:
		return JsonResponse(status=HTTPStatus.NOT_FOUND, data={})

	return JsonResponse(status=HTTPStatus.NO_CONTENT, data={})
