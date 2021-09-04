from http import HTTPStatus
from http.client import HTTPSConnection
from typing import List

from django.http import JsonResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_safe, require_POST, require_http_methods
import requests

from auth_api.utils import login_required_json


GIST_LIST_QUERY = """
{
  viewer {
    login
    gists(first: 100, privacy: ALL) {
      totalCount
      nodes {
        id
        name
        url
        description
        files {
          name
          isImage
          language {
            name
          }
        }
      }
    }
  }
}
"""


@login_required_json
@csrf_exempt
def gists_index_view(request):
	gh_identity = request.user.github_ids.first()
	if gh_identity is None:
		return JsonResponse(status=HTTPStatus.UNAUTHORIZED, data={
			"error": {
				"code": "github-identity-unavailable-when-fetching-gists",
				"message": "Cannot fetch gists since GitHub Identity not available for current user.",
			},
		})

	access_token = gh_identity.access_token

	if request.method == "GET":
		return list_gists_view(request, access_token)
	elif request.method == "POST":
		return create_gist_view(request, access_token)


@require_safe
def list_gists_view(request, access_token: str):
	response = requests.post(
		"https://api.github.com/graphql",
		headers={
			"Accept": "application/vnd.github.v3+json",
			"Authorization": "Bearer " + access_token,
		},
		json={
			"query": GIST_LIST_QUERY,
		},
	)

	if response.status_code != 200:
		print("Error fetching gists", response.content())
		return JsonResponse(status=HTTPStatus.UNAUTHORIZED, data={
			"error": {
				"code": "gists-list-api-fail",
				"message": "Error fetching gists from GitHub.",
			},
		})

	response_data = response.json()
	if "data" not in response_data:
		return JsonResponse(status=HTTPStatus.INTERNAL_SERVER_ERROR, data={
			"error": {
				"code": "missing-data-in-gist-response",
				"message": "Missing data key in response from Gist API.",
				"details": response_data,
			},
		})

	github_username = response_data["data"]["viewer"]["login"]
	all_gists = response.json()["data"]["viewer"]["gists"]["nodes"]
	gists_in_response = []

	for gist in all_gists:
		non_image_files: List = []
		first_md_file = None
		prestige_file_count = 0

		for fl in gist["files"]:
			if fl["isImage"]:
				continue

			del fl["isImage"]

			if first_md_file is None and fl["language"] and fl["language"].get("name") == "Markdown":
				first_md_file = fl
				continue

			if fl["name"].endswith(".prestige"):
				prestige_file_count += 1
				non_image_files.append(fl)

		if prestige_file_count < 1:
			continue

		gists_in_response.append({
			"id": gist["id"],
			"name": gist["name"],
			"owner": github_username,
			"description": gist["description"],
			"readme": first_md_file,
			"files": non_image_files,
		})

	return JsonResponse({
		"ok": [gh.access_token for gh in request.user.github_ids.all()],
		"gists": gists_in_response,
	})


@require_POST
def create_gist_view(request, access_token: str):
	title = request.parsed_body.get("title", "").strip()
	if not title:
		return JsonResponse(status_code=HTTPStatus.BAD_REQUEST, data={
			"error": {
				"code": "invalid-title-in-create-gist",
				"message": "Missing or invalid title for creating a Gist.",
			},
		})

	description = request.parsed_body.get("description", "").strip()
	if not description:
		return JsonResponse(status_code=HTTPStatus.BAD_REQUEST, data={
			"error": {
				"code": "invalid-description-in-create-gist",
				"message": "Missing or invalid description for creating a Gist.",
			},
		})

	is_public = bool(request.parsed_body.get("isPublic", False))

	# Ref: <https://docs.github.com/en/rest/reference/gists#create-a-gist>.
	response = requests.post(
		"https://api.github.com/gists",
		headers={
			"Accept": "application/vnd.github.v3+json",
			"Authorization": "Bearer " + access_token,
		},
		json={
			"description": description,
			"public": False and is_public,
			"files": {
				"_" + title + ".md": {"content": "This is a Prestige Gist!"},
				"main.prestige": {"content": "Hello!"},
			},
		},
	)

	print("request body sent", response.request.body)
	response.raise_for_status()

	return JsonResponse(data=request.parsed_body)


def load_gist_file_view(request, gh_username: str, gist_name: str, file_name: str = "main.prestige"):
	# Not using requests here. This API, technically, shouldn't load the whole Gist into memory, but stream it from
	# GitHub servers down to the client.
	conn = HTTPSConnection("gist.githubusercontent.com")
	conn.request("GET", f"/{gh_username}/{gist_name}/raw/{file_name}")
	return FileResponse(conn.getresponse(), content_type="text/plain")


@require_http_methods(["PATCH"])
@csrf_exempt  # TODO: Include the csrf token when loading gists, verify it here.
def update_gist_view(request, gist_id: str):
	files = request.parsed_body.get("files")
	if not files:
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, data={
			"error": {
				"code": "missing-files-in-update-gist",
				"message": "Missing files key in update gist request",
			},
		})

	readme_name = request.parsed_body.get("readmeName")
	if not readme_name:
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, data={
			"error": {
				"code": "missing-readme-name-in-update-gist",
				"message": "Missing readmeName key in update gist request",
			},
		})

	gh_identity = request.user.github_ids.first()
	if gh_identity is None:
		return JsonResponse(status=HTTPStatus.UNAUTHORIZED, data={
			"error": {
				"code": "github-identity-unavailable-when-fetching-gists",
				"message": "Cannot fetch gists since GitHub Identity not available for current user.",
			},
		})

	access_token = gh_identity.access_token

	files[readme_name] = {
		"content": "This is an updated Prestige Gist!",
	}

	# Ref: <https://docs.github.com/en/rest/reference/gists#update-a-gist>.
	response = requests.patch(
		"https://api.github.com/gists/" + gist_id,
		headers={
			"Accept": "application/vnd.github.v3+json",
			"Authorization": "Bearer " + access_token,
		},
		json={
			"files": files,
		},
	)

	if response.status_code != 200:
		return JsonResponse(status=HTTPStatus.INTERNAL_SERVER_ERROR, data={
			"error": {
				"code": "error-from-gist-patch-api",
				"message": "Error updating Gist.",
				"details": response.json(),
			},
		})

	return JsonResponse(data={"ok": True})
