from http import HTTPStatus
from http.client import HTTPSConnection
from typing import List
import logging

from django.http import JsonResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_safe, require_POST, require_http_methods
from django.template.loader import render_to_string
import requests

from auth_api.utils import login_required_json

log = logging.getLogger(__name__)

# Duplicated in Workspace.ts
INITIAL_SHEET_CONTENT = '''# Welcome to Prestige! Your newest developer tool!
# Just enter the HTTP requests you want to make and hit Ctrl+Enter (or Cmd+Enter) to execute.
# Like this one right here:

GET https://httpbun.com/get?name=haha

###

# Lines starting with a single '#' like this are comments.
# Learn more about the syntax at ${window.location.origin}/docs/guides/syntax/.
# Let's make a POST request!

POST https://httpbun.com/post
Content-Type: application/x-www-form-urlencoded

username=sherlock&password=elementary

###

# Custom headers, easy as popcorn.
# Learn more at ${window.location.origin}/docs/guides/syntax/#header-section.

GET https://httpbun.com/headers
X-Custom1: custom header value one
X-Custom2: custom header value two

### javascript

// This is a Javascript block, so comments start with '//'.
// The following will be available for templating in requests *after* this Javascript block.
// Learn more at ${window.location.origin}/docs/guides/javascript-blocks/.
this.data.postUrl = "post"

###

# Let's use templates to make the same POST request as before!
# Learn more at: ${window.location.origin}/docs/guides/templating/.
POST https://httpbun.com/${postUrl}
Content-Type: application/x-www-form-urlencoded

username=sherlock&password=elementary

###

# We can define a Javascript function to be called when this request finishes execution.
POST https://httpbun.com/post

one=1&two=2

@onFinish(response) {
	alert("Request finished!")
}
'''

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

	if request.method == "GET":
		return list_gists_view(request, gh_identity)
	elif request.method == "POST":
		return create_gist_view(request, gh_identity)


@require_safe
def list_gists_view(request, gh_identity):
	response = requests.post(
		"https://api.github.com/graphql",
		headers={
			"Accept": "application/vnd.github.v3+json",
			"Authorization": "Bearer " + gh_identity.plain_access_token(),
		},
		json={
			"query": GIST_LIST_QUERY,
		},
	)

	if response.status_code != 200:
		log.info("Error fetching gists", response.content())
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
		"gists": gists_in_response,
	})


@require_POST
def create_gist_view(request, gh_identity):
	access_token = gh_identity.plain_access_token()

	title = request.parsed_body.get("title", "")
	if not title or not isinstance(title, str):
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, data={
			"error": {
				"code": "invalid-title-in-create-gist",
				"message": "Missing or invalid title for creating a Gist.",
			},
		})

	description = request.parsed_body.get("description", "")
	if description is not None and not isinstance(description, str):
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, data={
			"error": {
				"code": "invalid-description-in-create-gist",
				"message": "Invalid description for creating a Gist.",
			},
		})

	title = title.strip()
	description = description.strip()

	content = request.parsed_body.get("content", "") or INITIAL_SHEET_CONTENT
	if content is None:
		content = INITIAL_SHEET_CONTENT
	elif not isinstance(content, str):
		return JsonResponse(status=HTTPStatus.BAD_REQUEST, data={
			"error": {
				"code": "invalid-content-in-create-gist",
				"message": "Invalid content for creating a Gist.",
			},
		})

	is_public = bool(request.parsed_body.get("isPublic", False))

	readme_name = "_" + title + ".md"
	files = {
		readme_name: {
			"content": "# " + title,
		},
		"main.prestige": {
			"content": content,
		},
	}

	# Ref: <https://docs.github.com/en/rest/reference/gists#create-a-gist>.
	payload = {
		"description": description,
		"public": is_public,
		"files": files,
	}
	log.info("create gist with %r", payload)
	creation_response = requests.post(
		"https://api.github.com/gists",
		headers={
			"Accept": "application/vnd.github.v3+json",
			"Authorization": "Bearer " + access_token,
		},
		json=payload,
	)

	if not creation_response.ok:
		response_data = creation_response.json()
		log.error(
			"Error creating Gist: %r %r %r",
			creation_response.status_code,
			creation_response.reason,
			response_data,
		)
		# TODO: Raise an alert to Rollbar here.
		return JsonResponse(data={
			"ok": False,
			"error": {
				"code": "gist-creation-failed",
				"message": "Failed to create Gist. We are working to fix this.",
			}
		})

	gist_id = creation_response.json()["id"]

	files[readme_name]["content"] = render_to_string("gist_readme.md", {
		"title": title,
		"github_handle": gh_identity.user_handle,
		"gist_id": gist_id,
	}, request)

	# Ref: <https://docs.github.com/en/rest/reference/gists#update-a-gist>.
	updation_response = requests.patch(
		"https://api.github.com/gists/" + gist_id,
		headers={
			"Accept": "application/vnd.github.v3+json",
			"Authorization": "Bearer " + access_token,
		},
		json={
			"files": files,
		},
	)

	if not updation_response.ok:
		response_data = updation_response.json()
		log.error(
			"Error updating Gist, right after creating it: %r %r %r",
			updation_response.status_code,
			updation_response.reason,
			response_data,
		)
		# TODO: Raise an alert to Rollbar here.
		return JsonResponse(data={
			"ok": False,
			"error": {
				"code": "gist-update-after-creation-failed",
				"message": "Partially failed to create Gist. We are working to fix this.",
			}
		})

	# The creation response includes a `git_push_url`, perhaps we can force push to clear the history of creating and
	# updating in two steps above?

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

	title = readme_name.lstrip("_")
	if title.startswith("_"):
		title = title[1:]
	if title.endswith(".md"):
		title = title[:-3]

	files[readme_name] = {
		"content": render_to_string("gist_readme.md", {
			"title": title,
			"github_handle": gh_identity.user_handle,
			"gist_id": gist_id,
		}, request)
	}

	# Ref: <https://docs.github.com/en/rest/reference/gists#update-a-gist>.
	response = requests.patch(
		"https://api.github.com/gists/" + gist_id,
		headers={
			"Accept": "application/vnd.github.v3+json",
			"Authorization": "Bearer " + gh_identity.plain_access_token(),
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
