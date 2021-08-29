from http import HTTPStatus
from typing import List

from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
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


def list_gists_view(request, access_token: str):
	response = requests.post(
		"https://api.github.com/graphql",
		headers={
			# "Accept": "application/vnd.github.v3+json",
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

	github_username = response.json()["data"]["viewer"]["login"]
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
	raw_url = f"https://gist.githubusercontent.com/{gh_username}/{gist_name}/raw/{file_name}"
	return HttpResponse(requests.get(raw_url).text, content_type="text/plain")
