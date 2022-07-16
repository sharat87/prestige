package proxy

import (
	"github.com/sharat87/prestige/apitests/tastysession"
	"github.com/sharat87/prestige/httpclient"
	"github.com/sharat87/prestige/utils"
	"net/http"
	"testing"
)

func TestMultipartFormField(t *testing.T) {
	ts := tastysession.New(t)

	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/proxy",
		Body: map[string]any{
			"url":    "http://localhost:3043/post",
			"method": "POST",
			"headers": [][]string{
				{"content-type", "multipart/form-data"},
			},
			"timeout":  300,
			"bodyType": "multipart/form-data",
			"body":     `{"name":"Sherlock"}`,
		},
	})
	ts.AssertStatusCode(http.StatusOK)

	ts.Nil(ts.LastResponseBody["cookies"], "cookies")
	ts.Nil(ts.LastResponseBody["history"], "history")

	responseValue := ts.LastResponseBody["response"].(map[string]any)
	ts.Equal(float64(200), responseValue["status"], "status")
	ts.Equal("200 OK", responseValue["statusText"], "statusText")

	remoteResponseBody := utils.ParseJson([]byte(responseValue["body"].(string)))
	ts.Equal("", remoteResponseBody["data"], "data")
	ts.Equal(map[string]any{}, remoteResponseBody["args"], "args")
	ts.Equal(map[string]any{}, remoteResponseBody["files"], "files")
	ts.Equal(map[string]any{
		"name": "Sherlock",
	}, remoteResponseBody["form"], "form")
	ts.Nil(remoteResponseBody["json"], "json")
	ts.Equal("POST", remoteResponseBody["method"], "method")
	ts.Equal("http://localhost:3043/post", remoteResponseBody["url"], "url")
	// TODO: Check content-type header.
}

func TestMultipartFileField(t *testing.T) {
	ts := tastysession.New(t)

	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/proxy",
		Body: map[string]any{
			"url":    "http://localhost:3043/post",
			"method": "POST",
			"headers": [][]string{
				{"content-type", "multipart/form-data"},
			},
			"timeout":  300,
			"bodyType": "multipart/form-data",
			"body":     `{"file":{"name":"content.txt","type":"text/plain","body":"c29tZSB0ZXh0IGNvbnRlbnQgaGVyZQ=="}}`,
		},
	})
	ts.AssertStatusCode(http.StatusOK)

	ts.Nil(ts.LastResponseBody["cookies"], "cookies")
	ts.Nil(ts.LastResponseBody["history"], "history")

	responseValue := ts.LastResponseBody["response"].(map[string]any)
	ts.Equal(float64(200), responseValue["status"], "status")
	ts.Equal("200 OK", responseValue["statusText"], "statusText")

	remoteResponseBody := utils.ParseJson([]byte(responseValue["body"].(string)))
	ts.Equal("", remoteResponseBody["data"], "data")
	ts.Equal(map[string]any{}, remoteResponseBody["args"], "args")
	ts.Equal(map[string]any{
		"file": "some text content here",
	}, remoteResponseBody["files"], "files")
	ts.Equal(map[string]any{}, remoteResponseBody["form"], "form")
	ts.Nil(remoteResponseBody["json"], "json")
	ts.Equal("POST", remoteResponseBody["method"], "method")
	ts.Equal("http://localhost:3043/post", remoteResponseBody["url"], "url")
	// TODO: Check content-type header.
}

func TestMultipartFileFieldInvalidBase64(t *testing.T) {
	ts := tastysession.New(t)

	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/proxy",
		Body: map[string]any{
			"url":    "http://localhost:3043/post",
			"method": "POST",
			"headers": [][]string{
				{"content-type", "multipart/form-data"},
			},
			"timeout":  300,
			"bodyType": "multipart/form-data",
			"body":     `{"file":{"name":"content.txt","type":"text/plain","body":"some invalid base64 data"}}`,
		},
	})
	ts.AssertStatusCode(http.StatusBadRequest)

	ts.Nil(ts.LastResponseBody["cookies"], "cookies")
	ts.Nil(ts.LastResponseBody["history"], "history")
	ts.Nil(ts.LastResponseBody["response"], "response")

	ts.Equal(
		"error-decoding-file-body",
		ts.LastResponseBody["error"].(map[string]any)["code"],
		"error code",
	)
}
