package tastysession

import (
	"bytes"
	"context"
	"github.com/google/go-cmp/cmp"
	"github.com/sharat87/prestige/config"
	"github.com/sharat87/prestige/dbclient"
	"github.com/sharat87/prestige/httpclient"
	"github.com/sharat87/prestige/mux"
	"github.com/sharat87/prestige/utils"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

type TastySession struct {
	T                *testing.T
	Mux              mux.Mux
	LastResponse     *http.Response
	LastResponseBody map[string]any
}

func (ts *TastySession) Do(r httpclient.Request) {
	request := httptest.NewRequest(r.Method, "http://localhost"+r.URL, bytes.NewReader(utils.ToJson(r.Body)))

	if ts.LastResponse != nil {
		for _, cookie := range ts.LastResponse.Cookies() {
			request.AddCookie(cookie)
		}
	}

	for name, value := range r.Headers {
		request.Header.Set(name, value)
	}

	if request.Method != http.MethodGet {
		request.Header.Set("Content-Type", "application/json")
	}

	w := httptest.NewRecorder()
	ts.Mux.ServeHTTP(w, request)

	ts.LastResponse = w.Result()
	responseBody, _ := io.ReadAll(ts.LastResponse.Body)

	ts.T.Logf("Parsing response: << %s >>", string(responseBody))
	ts.LastResponseBody = utils.ParseJson(responseBody)
}

func (ts *TastySession) AssertStatusCode(code int) {
	if ts.LastResponse.StatusCode != code {
		ts.T.Errorf("Expected status code %d, got %d", code, ts.LastResponse.StatusCode)
	}
}

func (ts *TastySession) AssertResponse(want map[string]any) {
	if diff := cmp.Diff(want, ts.LastResponseBody); diff != "" {
		ts.T.Errorf("Got: %#v\nDiff (-want +got):\n%s", ts.LastResponseBody, diff)
	}
}

func (ts *TastySession) UseHTTPClient(client httpclient.HTTPClient) {
	ts.Mux.UseHTTPClient(client)
}

func (ts *TastySession) Nil(got any, name string) {
	if got != nil {
		ts.T.Errorf("Want %q to be nil, but got %#v", name, got)
	}
}

func (ts *TastySession) Equal(want any, got any, name string) {
	if diff := cmp.Diff(want, got); diff != "" {
		ts.T.Errorf("Got %q: %#v\nDiff (-want +got):\n%s", name, got, diff)
	}
}

func New(t *testing.T) *TastySession {
	m := mux.New()

	m.UseConfig(config.Config{
		EncryptionKey: *(*[32]byte)([]byte("a secret with exactly <32> bytes")),
		AllowedHosts: map[string]any{
			"localhost": nil,
		},
	})

	dbUri := strings.Replace(os.Getenv("PRESTIGE_DATABASE_URI"), "%%", t.Name(), 1)
	m.UseDBClient(dbclient.New(context.Background(), dbUri))

	t.Cleanup(func() {
		if err := m.Close(); err != nil {
			log.Printf("Error closing mux in test %q: %v", t.Name(), err)
		}
	})

	return &TastySession{
		T:   t,
		Mux: *m,
	}
}
