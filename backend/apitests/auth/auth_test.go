package auth

import (
	"github.com/sharat87/prestige/apitests/tastysession"
	"github.com/sharat87/prestige/httpclient"
	"net/http"
	"testing"
)

func TestAuthHappy(t *testing.T) {
	email := t.Name() + "@example.com"
	ts := tastysession.New(t)

	// Register
	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/auth/register",
		Body: map[string]any{
			"email":          email,
			"password":       "dummy-pass",
			"recaptchaToken": "",
		},
	})
	ts.AssertStatusCode(http.StatusCreated)
	ts.AssertResponse(map[string]any{
		"user": map[string]any{
			"email":             email,
			"isGitHubConnected": false,
		},
	})

	// Profile
	ts.Do(httpclient.Request{
		Method: http.MethodGet,
		URL:    "/auth/profile",
	})
	ts.AssertStatusCode(http.StatusOK)
	ts.AssertResponse(map[string]any{
		"user": map[string]any{
			"email":             email,
			"isGitHubConnected": false,
		},
	})

	// Logout
	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/auth/logout",
	})

	ts.AssertStatusCode(http.StatusOK)
	ts.AssertResponse(map[string]any{
		"ok": true,
	})

	// Check profile
	ts.Do(httpclient.Request{
		Method: http.MethodGet,
		URL:    "/auth/profile",
	})

	ts.AssertStatusCode(http.StatusUnauthorized)

	// Login
	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/auth/login",
		Body: map[string]any{
			"email":          email,
			"password":       "dummy-pass",
			"recaptchaToken": "",
		},
	})

	ts.AssertStatusCode(http.StatusOK)
	ts.AssertResponse(map[string]any{
		"user": map[string]any{
			"email":             email,
			"isGitHubConnected": false,
		},
	})

	// Check Profile
	ts.Do(httpclient.Request{
		Method: http.MethodGet,
		URL:    "/auth/profile",
	})

	ts.AssertStatusCode(http.StatusOK)
	ts.AssertResponse(map[string]any{
		"user": map[string]any{
			"email":             email,
			"isGitHubConnected": false,
		},
	})

	// Logout
	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/auth/logout",
	})

	ts.AssertStatusCode(http.StatusOK)

	// Check profile
	ts.Do(httpclient.Request{
		Method: http.MethodGet,
		URL:    "/auth/profile",
	})

	ts.AssertStatusCode(http.StatusUnauthorized)
}

func TestRegisterWithEmptyBody(t *testing.T) {
	ts := tastysession.New(t)
	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/auth/register",
	})
	ts.AssertStatusCode(http.StatusBadRequest)
	ts.AssertResponse(map[string]any{
		"error": "email too small, min 3 characters",
	})
}

func TestRegisterWithMissingPassword(t *testing.T) {
	email := t.Name() + "@example.com"
	ts := tastysession.New(t)
	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/auth/register",
		Body: map[string]any{
			"email": email,
		},
	})
	ts.AssertStatusCode(http.StatusBadRequest)
	ts.AssertResponse(map[string]any{
		"error": "password too small, min 4 characters",
	})
}

func TestRegisterWithDuplicateEmail(t *testing.T) {
	email := t.Name() + "@example.com"
	ts := tastysession.New(t)

	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/auth/register",
		Body: map[string]any{
			"email":    email,
			"password": "dummy-pass",
		},
	})
	ts.AssertStatusCode(http.StatusCreated)
	ts.AssertResponse(map[string]any{
		"user": map[string]any{
			"email":             email,
			"isGitHubConnected": false,
		},
	})

	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/auth/register",
		Body: map[string]any{
			"email":    email,
			"password": "dummy-pass",
		},
	})
	ts.AssertStatusCode(http.StatusConflict)
	ts.AssertResponse(map[string]any{
		"error": map[string]any{
			"code":    "err-email-already-exists",
			"message": "Account with email already exists",
		},
	})
}
