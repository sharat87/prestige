package csrf

// Theory is that if we don't accept any payloads that browser forms send, then we don't have the CSRF attack surface area.

import (
	"bytes"
	"github.com/sharat87/prestige/apitests/tastysession"
	"github.com/sharat87/prestige/httpclient"
	"github.com/sharat87/prestige/utils"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func DoWithRawBody(ts *tastysession.TastySession, r httpclient.Request) {
	request := httptest.NewRequest(r.Method, "http://localhost"+r.URL, bytes.NewReader(r.Body.([]byte)))

	if ts.LastResponse != nil {
		for _, cookie := range ts.LastResponse.Cookies() {
			request.AddCookie(cookie)
		}
	}

	for name, value := range r.Headers {
		request.Header.Set(name, value)
	}

	w := httptest.NewRecorder()
	ts.Mux.ServeHTTP(w, request)

	ts.LastResponse = w.Result()
	responseBody, _ := io.ReadAll(ts.LastResponse.Body)
	ts.LastResponseBody = utils.ParseJson(responseBody)
}

func TestDenyUrlencodedPayload(t *testing.T) {
	ts := tastysession.New(t)

	paths := []string{
		"auth/register",
		"auth/login",
		"auth/profile",
		"auth/logout",
		"auth/github",
		"auth/github/callback",
		"gist",
		"gist/git-file/owner/id/name",
		"gist/git-file/owner/id",
		"gist/update/id",
		"proxy",
	}

	for _, path := range paths {
		DoWithRawBody(ts, httpclient.Request{
			Method: http.MethodPost,
			URL:    path,
			Headers: map[string]string{
				"Content-Type": "application/x-www-form-urlencoded",
			},
			Body: []byte("email=me@me.com&password=else&recaptchaToken=abcd"),
		})
		ts.AssertStatusCode(http.StatusBadRequest)
		ts.Equal([]*http.Cookie{}, ts.LastResponse.Cookies(), "cookies for "+path)
	}
}
