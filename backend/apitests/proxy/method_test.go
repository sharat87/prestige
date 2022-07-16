package proxy

import (
	"github.com/sharat87/prestige/apitests/tastysession"
	"github.com/sharat87/prestige/httpclient"
	"github.com/sharat87/prestige/utils"
	"net/http"
	"testing"
)

func TestProxyGet(t *testing.T) {
	ts := tastysession.New(t)

	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/proxy",
		Body: map[string]any{
			"url":      "http://localhost:3043/get",
			"method":   "GET",
			"headers":  []string{},
			"timeout":  300,
			"bodyType": "raw",
			"body":     "",
		},
	})
	ts.AssertStatusCode(http.StatusOK)

	ts.Nil(ts.LastResponseBody["response"].(map[string]any)["cookies"], "cookies")
	ts.Nil(ts.LastResponseBody["response"].(map[string]any)["history"], "history")

	ts.Equal(ts.LastResponseBody["response"].(map[string]any)["status"], float64(200), "status")
	ts.Equal(ts.LastResponseBody["response"].(map[string]any)["statusText"], "200 OK", "statusText")

	payload := utils.ParseJson([]byte(ts.LastResponseBody["response"].(map[string]any)["body"].(string)))
	ts.Equal(payload["method"], "GET", "method in payload")
	ts.Equal(payload["url"], "http://localhost:3043/get", "url in payload")
}

func TestProxyPost(t *testing.T) {
	ts := tastysession.New(t)

	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/proxy",
		Body: map[string]any{
			"url":      "http://localhost:3043/post",
			"method":   "POST",
			"headers":  []string{},
			"timeout":  300,
			"bodyType": "raw",
			"body":     "some post payload",
		},
	})
	ts.AssertStatusCode(http.StatusOK)

	ts.Nil(ts.LastResponseBody["response"].(map[string]any)["cookies"], "cookies")
	ts.Nil(ts.LastResponseBody["response"].(map[string]any)["history"], "history")

	ts.Equal(ts.LastResponseBody["response"].(map[string]any)["status"], float64(200), "status")
	ts.Equal(ts.LastResponseBody["response"].(map[string]any)["statusText"], "200 OK", "statusText")

	payload := utils.ParseJson([]byte(ts.LastResponseBody["response"].(map[string]any)["body"].(string)))
	ts.Equal(payload["method"], "POST", "method in payload")
	ts.Equal(payload["url"], "http://localhost:3043/post", "url in payload")
}

func TestProxyPatch(t *testing.T) {
	ts := tastysession.New(t)

	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/proxy",
		Body: map[string]any{
			"url":      "http://localhost:3043/patch",
			"method":   "PATCH",
			"headers":  []string{},
			"timeout":  300,
			"bodyType": "raw",
			"body":     "some patch payload",
		},
	})
	ts.AssertStatusCode(http.StatusOK)

	ts.Nil(ts.LastResponseBody["response"].(map[string]any)["cookies"], "cookies")
	ts.Nil(ts.LastResponseBody["response"].(map[string]any)["history"], "history")

	ts.Equal(ts.LastResponseBody["response"].(map[string]any)["status"], float64(200), "status")
	ts.Equal(ts.LastResponseBody["response"].(map[string]any)["statusText"], "200 OK", "statusText")

	payload := utils.ParseJson([]byte(ts.LastResponseBody["response"].(map[string]any)["body"].(string)))
	ts.Equal(payload["method"], "PATCH", "method in payload")
	ts.Equal(payload["url"], "http://localhost:3043/patch", "url in payload")
}

func TestProxyDelete(t *testing.T) {
	ts := tastysession.New(t)

	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/proxy",
		Body: map[string]any{
			"url":      "http://localhost:3043/delete",
			"method":   "DELETE",
			"headers":  []string{},
			"timeout":  300,
			"bodyType": "raw",
			"body":     "",
		},
	})
	ts.AssertStatusCode(http.StatusOK)

	ts.Nil(ts.LastResponseBody["response"].(map[string]any)["cookies"], "cookies")
	ts.Nil(ts.LastResponseBody["response"].(map[string]any)["history"], "history")

	ts.Equal(ts.LastResponseBody["response"].(map[string]any)["status"], float64(200), "status")
	ts.Equal(ts.LastResponseBody["response"].(map[string]any)["statusText"], "200 OK", "statusText")

	payload := utils.ParseJson([]byte(ts.LastResponseBody["response"].(map[string]any)["body"].(string)))
	ts.Equal(payload["method"], "DELETE", "method in payload")
	ts.Equal(payload["url"], "http://localhost:3043/delete", "url in payload")
}
