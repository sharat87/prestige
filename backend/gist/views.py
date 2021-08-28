from http import HTTPStatus

from django.http import HttpResponse, JsonResponse
from django.urls import reverse
import requests

from auth_api.utils import login_required_json


GIST_LIST_QUERY = """
{
  viewer {
    login
    gists(first: 100) {
      totalCount
      nodes {
        id
        name
        url
        description
        files {
          name
          isImage
          text(truncate: 80)  # For pulling out a header or such from a README file, if description is blank.
        }
      }
    }
  }
}
"""


@login_required_json
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
		return create_gists_view(request, access_token)


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
		non_image_files = []
		for fl in gist["files"]:
			if fl["isImage"]:
				continue
			del fl["isImage"]
			non_image_files.append(fl)

		if not non_image_files:
			continue

		gists_in_response.append({
			"name": gist["name"],
			"owner": github_username,
			"description": gist["description"],
			"files": non_image_files,
		})

	return JsonResponse({
		"ok": [gh.access_token for gh in request.user.github_ids.all()],
		"gists": gists_in_response,
	})


def load_gist_file_view(request, gh_username: str, gist_name: str, file_name: str):
	raw_url = f"https://gist.githubusercontent.com/{gh_username}/{gist_name}/raw/{file_name}"
	return HttpResponse(requests.get(raw_url).text, content_type="text/plain")


def create_gists_view(request, access_token: str):
	pass
