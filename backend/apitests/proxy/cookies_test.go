package proxy

import (
	"github.com/sharat87/prestige/apitests/tastysession"
	"github.com/sharat87/prestige/httpclient"
	"github.com/sharat87/prestige/utils"
	"net/http"
	"testing"
)

func TestSetCookie(t *testing.T) {
	ts := tastysession.New(t)

	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/proxy",
		Body: map[string]any{
			"url":      "http://localhost:3043/cookies/set?name=Sherlock",
			"method":   "POST",
			"headers":  []any{},
			"timeout":  300,
			"bodyType": "raw",
			"body":     "",
		},
	})
	ts.AssertStatusCode(http.StatusOK)

	ts.Equal(
		map[string]any{
			"localhost:3043": map[string]any{
				"/": map[string]any{
					"name": map[string]any{
						"expires": any(nil),
						"secure":  false,
						"value":   "Sherlock",
					},
				},
			},
		},
		ts.LastResponseBody["cookies"],
		"cookies",
	)

	responseValue, ok := ts.LastResponseBody["response"].(map[string]any)
	if !ok {
		t.Fatalf("response is not a map, but %#v", ts.LastResponseBody["response"])
	}
	ts.Equal(float64(200), responseValue["status"], "status")
	ts.Equal("200 OK", responseValue["statusText"], "statusText")

	remoteResponseBody := utils.ParseJson([]byte(responseValue["body"].(string)))
	ts.Equal(
		map[string]any{
			"cookies": map[string]any{
				"name": "Sherlock",
			},
		},
		remoteResponseBody,
		"data",
	)
}

func TestCheckExistingCookie(t *testing.T) {
	ts := tastysession.New(t)

	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/proxy",
		Body: map[string]any{
			"url":     "http://localhost:3043/cookies/set?brother=Mycroft",
			"method":  "POST",
			"headers": []any{},
			"cookies": map[string]any{
				"localhost:3043": map[string]any{
					"/": map[string]any{
						"name": map[string]any{
							"value": "Sherlock",
						},
					},
				},
				"localhost": map[string]any{
					"/": map[string]any{
						"name": map[string]any{
							"value": "Sherlock without a port",
						},
					},
				},
				"example.com": map[string]any{
					"/": map[string]any{
						"name": map[string]any{
							"value": "Sherlock from example",
						},
					},
				},
			},
			"timeout":  300,
			"bodyType": "raw",
			"body":     "",
		},
	})
	ts.AssertStatusCode(http.StatusOK)

	ts.Equal(
		map[string]any{
			"localhost:3043": map[string]any{
				"/": map[string]any{
					"name": map[string]any{
						"expires": any(nil),
						"secure":  false,
						"value":   "Sherlock",
					},
					"brother": map[string]any{
						"expires": any(nil),
						"secure":  false,
						"value":   "Mycroft",
					},
				},
			},
			"localhost": map[string]any{
				"/": map[string]any{
					"name": map[string]any{
						"expires": any(nil),
						"secure":  false,
						"value":   "Sherlock", // This also changes because cookies are shared across ports.
					},
					"brother": map[string]any{
						"expires": any(nil),
						"secure":  false,
						"value":   "Mycroft",
					},
				},
			},
			"example.com": map[string]any{
				"/": map[string]any{
					"name": map[string]any{
						"expires": any(nil),
						"secure":  false,
						"value":   "Sherlock from example",
					},
				},
			},
		},
		ts.LastResponseBody["cookies"],
		"cookies",
	)

	responseValue := ts.LastResponseBody["response"].(map[string]any)
	ts.Equal(float64(200), responseValue["status"], "status")
	ts.Equal("200 OK", responseValue["statusText"], "statusText")

	remoteResponseBody := utils.ParseJson([]byte(responseValue["body"].(string)))
	ts.Equal(
		map[string]any{
			"cookies": map[string]any{
				"name":    "Sherlock",
				"brother": "Mycroft",
			},
		},
		remoteResponseBody,
		"data",
	)
}

func TestDeleteCookie(t *testing.T) {
	ts := tastysession.New(t)

	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/proxy",
		Body: map[string]any{
			"url":     "http://localhost:3043/cookies/delete?name=1",
			"method":  "POST",
			"headers": []any{},
			"cookies": map[string]any{
				"localhost:3043": map[string]any{
					"/": map[string]any{
						"name": map[string]any{
							"value": "Sherlock",
						},
						"brother": map[string]any{
							"value": "Mycroft",
						},
					},
				},
				"localhost": map[string]any{
					"/": map[string]any{
						"name": map[string]any{
							"value": "Sherlock without a port",
						},
					},
				},
				"example.com": map[string]any{
					"/": map[string]any{
						"name": map[string]any{
							"value": "Sherlock from example",
						},
					},
				},
			},
			"timeout":  300,
			"bodyType": "raw",
			"body":     "",
		},
	})
	ts.AssertStatusCode(http.StatusOK)

	ts.Equal(
		map[string]any{
			"localhost:3043": map[string]any{
				"/": map[string]any{
					"brother": map[string]any{
						"expires": any(nil),
						"secure":  false,
						"value":   "Mycroft",
					},
				},
			},
			"localhost": map[string]any{
				"/": map[string]any{
					"brother": map[string]any{
						"expires": any(nil),
						"secure":  false,
						"value":   "Mycroft",
					},
				},
			},
			"example.com": map[string]any{
				"/": map[string]any{
					"name": map[string]any{
						"expires": any(nil),
						"secure":  false,
						"value":   "Sherlock from example",
					},
				},
			},
		},
		ts.LastResponseBody["cookies"],
		"cookies",
	)

	responseValue := ts.LastResponseBody["response"].(map[string]any)
	ts.Equal(float64(200), responseValue["status"], "status")
	ts.Equal("200 OK", responseValue["statusText"], "statusText")

	remoteResponseBody := utils.ParseJson([]byte(responseValue["body"].(string)))
	ts.Equal(
		map[string]any{
			"cookies": map[string]any{
				"brother": "Mycroft",
			},
		},
		remoteResponseBody,
		"data",
	)
}

func TestDeleteLastCookie(t *testing.T) {
	ts := tastysession.New(t)

	ts.Do(httpclient.Request{
		Method: http.MethodPost,
		URL:    "/proxy",
		Body: map[string]any{
			"url":     "http://localhost:3043/cookies/delete?name=1",
			"method":  "POST",
			"headers": []any{},
			"cookies": map[string]any{
				"localhost:3043": map[string]any{
					"/": map[string]any{
						"name": map[string]any{
							"value": "Sherlock",
						},
					},
				},
			},
			"timeout":  300,
			"bodyType": "raw",
			"body":     "",
		},
	})
	ts.AssertStatusCode(http.StatusOK)

	ts.Nil(ts.LastResponseBody["cookies"], "cookies")

	responseValue := ts.LastResponseBody["response"].(map[string]any)
	ts.Equal(float64(200), responseValue["status"], "status")
	ts.Equal("200 OK", responseValue["statusText"], "statusText")

	remoteResponseBody := utils.ParseJson([]byte(responseValue["body"].(string)))
	ts.Equal(
		map[string]any{
			"cookies": map[string]interface{}{},
		},
		remoteResponseBody,
		"data",
	)
}
