package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/sharat87/prestige/dbclient"
	"github.com/sharat87/prestige/exchange"
	"github.com/sharat87/prestige/httpclient"
	"github.com/sharat87/prestige/utils"
	"go.mongodb.org/mongo-driver/bson"
	"log"
	"net/http"
)

type GitHubErrorResponse struct {
	Message          string `json:"message"`
	DocumentationUrl string `json:"documentation_url"`
}

// OAuthVerifyResponse Sample: {"access_token":"gho_sample_token", "scope":"repo,gist", "token_type":"bearer"}
type OAuthVerifyResponse struct {
	AccessToken string `json:"access_token"`
	Scope       string `json:"scope"`
	TokenType   string `json:"token_type"`
}

type UserDetailsResponse struct {
	Data struct {
		Viewer struct {
			DatabaseId uint   `json:"databaseId"`
			Id         string `json:"id"`
			Login      string `json:"login"`
			AvatarUrl  string `json:"avatarURL"`
			Email      string `json:"email"`
		} `json:"viewer"`
	} `json:"data"`
}

type UserEmailsResponse struct {
	IsVerified bool   `json:"verified"`
	Email      string `json:"email"`
	IsPrimary  bool   `json:"primary"`
}

func HandleGithubAuth(ctx context.Context, ex *exchange.Exchange) {
	if ex.RequireMethod(http.MethodGet) != nil {
		return
	}
	session := ex.InitSession(ctx)

	if ex.GitHubClient == nil {
		ex.RespondErrorDeprecated(http.StatusInternalServerError, errors.New("Github integration not available"))
		return
	}

	stateToken, err := utils.GenerateRandomString()
	if err != nil {
		log.Printf("Error generating random string for github auth state: %v", err)
		ex.RespondErrorDeprecated(http.StatusInternalServerError, err)
		return
	}

	ex.SaveSessionGithubAuthState(ctx, stateToken) // Do in separate thread?
	log.Printf("state token: %v", session)

	authUrl := "https://github.com/login/oauth/authorize?client_id=" + ex.GitHubClient.Id + "&scope=read:user user:email gist&state=" + stateToken
	http.Redirect(ex.ResponseWriter, &ex.Request, authUrl, http.StatusTemporaryRedirect)
}

func HandleGithubAuthCallback(ctx context.Context, ex *exchange.Exchange) {
	if ex.RequireMethod(http.MethodGet) != nil {
		return
	}
	session := ex.InitSession(ctx)

	if ex.GitHubClient == nil {
		ex.RespondErrorDeprecated(http.StatusInternalServerError, errors.New("Github integration not available"))
		return
	}

	queryParams := ex.Request.URL.Query()

	errorParam := queryParams.Get("error")
	if errorParam == "access_denied" {
		// The user clicked on "Cancel" instead of "Authorize".
		// ?error=access_denied&error_description=The+user+has+denied+your+application+access.&error_uri=https%3A%2F%2Fdocs.github.com%2Fapps%2Fmanaging-oauth-apps%2Ftroubleshooting-authorization-request-errors%2F%23access-denied
		jsMessageResponse(ex, errorParam)
		return
	}

	if errorParam != "" {
		ex.RespondErrorDeprecated(http.StatusUnauthorized, errors.New(errorParam))
		return
	}

	stateParam := queryParams.Get("state")
	if stateParam == "" || stateParam != session.GithubAuthState {
		ex.RespondErrorDeprecated(http.StatusUnauthorized, errors.New(fmt.Sprintf("state mismatch, expected %q, got %q", session.GithubAuthState, stateParam)))
		return
	}

	ex.SaveSessionGithubAuthState(ctx, "")

	codeParam := queryParams.Get("code")
	if codeParam == "" {
		ex.RespondErrorDeprecated(http.StatusInternalServerError, errors.New("missing OAuth2 code"))
		return
	}

	response, err := ex.HTTPDo(httpclient.Request{
		Method: http.MethodPost,
		URL:    "https://github.com/login/oauth/access_token?client_id=" + ex.GitHubClient.Id + "&client_secret=" + ex.GitHubClient.Secret + "&code=" + codeParam,
		Headers: map[string]string{
			"Accept": "application/json",
		},
	})
	if err != nil {
		if response != nil {
			log.Printf("Error response from Github oauth verification request: %v %s", response, response.Body)
			ex.RespondErrorDeprecated(http.StatusUnauthorized, errors.New("Github oauth verification failed"))
		} else {
			log.Printf("Error doing Github oauth verification request: %v", err)
			ex.RespondErrorDeprecated(http.StatusInternalServerError, err)
		}
		return
	}

	oAuthVerifyResponse := OAuthVerifyResponse{}
	err = json.Unmarshal(response.Body, &oAuthVerifyResponse)
	if err != nil {
		log.Printf("Error unmarshalling response body from access token request: %v %v", err, string(response.Body))
		ex.RespondErrorDeprecated(http.StatusUnauthorized, errors.New("access token failed"))
		return
	}

	if oAuthVerifyResponse.AccessToken == "" {
		// Example:  {"error":"incorrect_client_credentials","error_description":"The client_id and/or client_secret passed are incorrect.","error_uri":"https://docs.github.com/apps/managing-oauth-apps/troubleshooting-oauth-app-access-token-request-errors/#incorrect-client-credentials"}
		type ErrorResponse struct {
			Error            string `json:"error"`
			ErrorDescription string `json:"error_description"`
			ErrorUri         string `json:"error_uri"`
		}
		errorResponse := ErrorResponse{}
		err = json.Unmarshal(response.Body, &errorResponse)
		if err != nil {
			log.Printf("Error unmarshalling error response body from access token request: %v %v", err, string(response.Body))
			ex.RespondErrorDeprecated(http.StatusUnauthorized, errors.New("access token failed"))
			return
		}
		log.Printf("Error getting access token %v", errorResponse)
		ex.RespondErrorDeprecated(http.StatusInternalServerError, errors.New(errorResponse.Error))
		return
	}

	response, err = ex.HTTPDo(httpclient.Request{
		Method: http.MethodPost,
		URL:    "https://api.github.com/graphql",
		Body: map[string]any{
			"query": `
				{
				  viewer {
					databaseId
					id
					login
					avatarURL: avatarUrl
					email
				  }
				}`,
		},
		Headers: map[string]string{
			"Accept":        "application/vnd.github.v3+json",
			"Authorization": "Bearer " + oAuthVerifyResponse.AccessToken,
		},
	})
	if err != nil {
		if response != nil {
			log.Printf("Error response from Github user details request: %v %s", response, string(response.Body))
			ex.RespondErrorDeprecated(http.StatusUnauthorized, errors.New("Github oauth verification failed"))
		} else {
			log.Printf("Error doing Github user details request: %v", err)
			ex.RespondErrorDeprecated(http.StatusInternalServerError, err)
		}
		return
	}

	userDetailsResponse := UserDetailsResponse{}
	err = json.Unmarshal(response.Body, &userDetailsResponse)
	if err != nil {
		log.Printf("Error unmarshalling response body from recaptcha verification request: %v %v", err, string(response.Body))
		ex.RespondErrorDeprecated(http.StatusUnauthorized, errors.New("error unmarshalling user details response"))
		return
	}

	gitHubUserId := userDetailsResponse.Data.Viewer.Id

	response, err = ex.HTTPDo(httpclient.Request{
		Method: http.MethodGet,
		URL:    "https://api.github.com/user/emails",
		Headers: map[string]string{
			"Accept":        "application/vnd.github.v3+json",
			"Authorization": "token " + oAuthVerifyResponse.AccessToken,
		},
	})
	if err != nil {
		if response != nil {
			log.Printf("Error response getting emails from Github: %v", err)
			ex.RespondErrorDeprecated(http.StatusUnauthorized, errors.New("getting emails from Github failed"))
		} else {
			log.Printf("Error getting emails from Github: %v", err)
			ex.RespondErrorDeprecated(http.StatusInternalServerError, err)
		}
		return
	}

	var userEmailsResponse []UserEmailsResponse
	err = json.Unmarshal(response.Body, &userEmailsResponse)
	if err != nil {
		log.Printf("Error unmarshalling response body from recaptcha verification request: %v %v", err, string(response.Body))
		ex.RespondErrorDeprecated(http.StatusUnauthorized, errors.New("cannot unmarshal emails response from Github"))
		return
	}

	var primaryEmailResponse *UserEmailsResponse
	for _, resp := range userEmailsResponse {
		if resp.IsPrimary {
			primaryEmailResponse = &resp
			break
		}
	}

	if primaryEmailResponse == nil {
		log.Printf("No primary email in Github: %v", string(response.Body))
		ex.RespondErrorDeprecated(http.StatusUnauthorized, errors.New("no primary email"))
		return
	}

	if !primaryEmailResponse.IsVerified {
		log.Printf("Primary email isn't verified on Github: %v", string(response.Body))
		ex.RespondErrorDeprecated(http.StatusUnauthorized, errors.New("primary email isn't verified"))
		return
	}

	encryptedToken, err := utils.Encrypt(ex.Config.EncryptionKey, oAuthVerifyResponse.AccessToken)
	if err != nil {
		log.Printf("Error encrypting access token: %v", err)
		ex.RespondErrorDeprecated(http.StatusInternalServerError, err)
		return
	}

	gitHubDetails := dbclient.GithubDetails{
		Id:          userDetailsResponse.Data.Viewer.Id,
		DatabaseId:  userDetailsResponse.Data.Viewer.DatabaseId,
		AccessToken: encryptedToken,
		Username:    userDetailsResponse.Data.Viewer.Login,
		AvatarURL:   userDetailsResponse.Data.Viewer.AvatarUrl,
	}

	// TODO: Define behaviour when primary email is changed on Github.

	updates, err := ex.DBClient.UpdateUser(
		ctx,
		bson.M{
			"github.id": gitHubUserId,
		},
		bson.M{
			"github": gitHubDetails,
		},
	)
	if err != nil {
		log.Printf("Error updating github details for user: %v %v", userDetailsResponse.Data.Viewer.Login, err)
		ex.RespondErrorDeprecated(http.StatusInternalServerError, errors.New("unable to update Github details"))
		return
	}

	if updates.MatchedCount == 0 {
		updates, err = ex.DBClient.UpdateUser(
			ctx,
			bson.M{
				"email": primaryEmailResponse.Email,
			},
			bson.M{
				"github": gitHubDetails,
			},
		)
		if err != nil {
			log.Printf("Error updating github details for user by email: %v %v", primaryEmailResponse.Email, err)
			ex.RespondErrorDeprecated(http.StatusInternalServerError, errors.New("unable to add Github details"))
			return
		}
	}

	if updates.MatchedCount == 0 {
		err := ex.DBClient.CreateUser(ctx, dbclient.User{
			Email:           primaryEmailResponse.Email,
			IsEmailVerified: true,
			Github:          &gitHubDetails,
		})
		if err != nil {
			log.Printf("Error inserting request to MongoDB: %v", err)
		}
	}

	ex.SetSessionUser(ctx, primaryEmailResponse.Email)

	jsMessageResponse(ex, "")
}

func jsMessageResponse(ex *exchange.Exchange, error string) {
	jsonData := string(utils.ToJson(map[string]any{
		"type":       "oauth",
		"provider":   "github",
		"isApproved": error == "",
		"error":      error,
	}))

	_, err := ex.ResponseWriter.Write([]byte(fmt.Sprintf(`<!doctype html>
	<title>Prestige</title>
	<h1>Finished. This window should close.</h1>
	<script>
	// TODO: Specify the incoming Origin here, instead of '*'.
	// See <https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage>
	window.opener.postMessage(%s, location.origin);
	window.close();
	</script>`, jsonData)))
	if err != nil {
		log.Printf("Error writing popup JS response: %v", err)
	}
}
