package auth

import (
	"github.com/sharat87/prestige/apitests/tastysession"
	"github.com/sharat87/prestige/httpclient"
	"github.com/sharat87/prestige/utils"
	"net/http"
	"testing"
)

type MockHTTPClient struct {
	do    func(req httpclient.Request) (*httpclient.Response, error)
	calls []httpclient.Request
}

func (m *MockHTTPClient) Do(req httpclient.Request) (*httpclient.Response, error) {
	m.calls = append(m.calls, req)
	return m.do(req)
}

func TestRegisterWithValidRecaptcha(t *testing.T) {
	ts := tastysession.New(t)
	ts.Mux.UseRecaptcha("rpi", "rsk", "rak")

	httpClient := &MockHTTPClient{
		do: func(req httpclient.Request) (*httpclient.Response, error) {
			return &httpclient.Response{
				StatusCode: http.StatusOK,
				Body: utils.ToJson(map[string]any{
					"tokenProperties": map[string]any{
						"valid":  true,
						"action": "SIGNUP",
					},
				}),
			}, nil
		},
	}
	ts.UseHTTPClient(httpClient)

	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/auth/register",
		Body: map[string]any{
			"email":          "one@example.com",
			"password":       "dummy-pass",
			"recaptchaToken": "recaptcha-dummy-token",
		},
	})

	ts.Equal(httpClient.calls[0], httpclient.Request{
		Method: http.MethodPost,
		URL:    "https://recaptchaenterprise.googleapis.com/v1beta1/projects/rpi/assessments?key=rak",
		Body: map[string]any{
			"event": map[string]any{
				"expectedAction": "SIGNUP",
				"siteKey":        "rsk",
				"token":          "recaptcha-dummy-token",
			},
		},
	}, "recaptcha request")

	ts.AssertStatusCode(http.StatusCreated)
	ts.AssertResponse(map[string]any{
		"user": map[string]any{
			"email":             "one@example.com",
			"isGitHubConnected": false,
		},
	})
}

func TestRegisterWithInvalidRecaptcha(t *testing.T) {
	ts := tastysession.New(t)
	ts.Mux.UseRecaptcha("rpi", "rsk", "rak")

	httpClient := &MockHTTPClient{
		do: func(req httpclient.Request) (*httpclient.Response, error) {
			return &httpclient.Response{
				StatusCode: http.StatusOK,
				Body: utils.ToJson(map[string]any{
					"tokenProperties": map[string]any{
						"valid":         false,
						"invalidReason": "dummy-reason",
						"action":        "SIGNUP",
					},
				}),
			}, nil
		},
	}
	ts.UseHTTPClient(httpClient)

	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/auth/register",
		Body: map[string]any{
			"email":          "one@example.com",
			"password":       "dummy-pass",
			"recaptchaToken": "recaptcha-dummy-token",
		},
	})

	ts.Equal(httpClient.calls[0], httpclient.Request{
		Method: http.MethodPost,
		URL:    "https://recaptchaenterprise.googleapis.com/v1beta1/projects/rpi/assessments?key=rak",
		Body: map[string]any{
			"event": map[string]any{
				"expectedAction": "SIGNUP",
				"siteKey":        "rsk",
				"token":          "recaptcha-dummy-token",
			},
		},
	}, "recaptcha request")

	ts.AssertStatusCode(http.StatusUnauthorized)
	ts.AssertResponse(map[string]any{
		"error": "recaptcha verification failed",
	})
}
