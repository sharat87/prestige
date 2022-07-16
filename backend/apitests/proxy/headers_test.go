package proxy

import (
	"github.com/sharat87/prestige/apitests/tastysession"
	"github.com/sharat87/prestige/httpclient"
	"net/http"
	"testing"
)

func TestCustomHeaders(t *testing.T) {
	ts := tastysession.New(t)

	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/proxy",
		Body: map[string]any{
			"url":    "http://localhost:3043/headers",
			"method": "GET",
			"headers": [][]string{
				{"X-Custom-Header", "custom-value"},
			},
			"timeout": 300,
		},
	})
	ts.AssertStatusCode(http.StatusOK)

	ts.Nil(ts.LastResponseBody["cookies"], "cookies")

	t.Logf("%#v", ts.LastResponseBody)

	ts.Equal(
		[]any{
			[]any{"X-Custom-Header", "custom-value"},
		},
		ts.LastResponseBody["response"].(map[string]any)["request"].(map[string]any)["headers"],
		"headers",
	)
}
