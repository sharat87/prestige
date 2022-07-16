package mux

import (
	"context"
	"github.com/sharat87/prestige/assets"
	"github.com/sharat87/prestige/auth"
	"github.com/sharat87/prestige/config"
	"github.com/sharat87/prestige/dbclient"
	"github.com/sharat87/prestige/exchange"
	"github.com/sharat87/prestige/gist"
	"github.com/sharat87/prestige/httpclient"
	"github.com/sharat87/prestige/proxy"
	"go.mongodb.org/mongo-driver/mongo"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"
)

type Mux struct {
	Routes          []Route
	Config          config.Config
	HTTPClient      httpclient.HTTPClient
	DBClient        dbclient.DBClient
	mongoClient     *mongo.Client
	RecaptchaConfig *exchange.RecaptchaConfig
	GitHubClient    *exchange.GitHubClient
}

type Route struct {
	Pattern regexp.Regexp
	Fn      HandlerFn
}

type HandlerFn func(ctx context.Context, ex *exchange.Exchange)

func New() *Mux {
	m := &Mux{}

	m.Route(`/env`, HandleEnv)

	m.Route(`/proxy/?`, proxy.HandleProxy)

	m.Route(`/auth/signup`, auth.HandleRegister) // Deprecated.
	m.Route(`/auth/register`, auth.HandleRegister)
	m.Route(`/auth/login`, auth.HandleLogin)
	m.Route(`/auth/logout`, auth.HandleLogout)
	m.Route(`/auth/profile`, auth.HandleProfile)
	//m.Route(`/auth/forgot-password/request`, auth.HandleForgotPasswordRequest)
	//m.Route(`/auth/forgot-password/verify`, auth.HandleForgotPasswordVerify)

	m.Route(`/auth/github`, auth.HandleGithubAuth)
	m.Route(`/auth/github/callback`, auth.HandleGithubAuthCallback)

	m.Route(`/gist/?`, gist.HandleGistIndex)
	m.Route(`/gist/get-file/(?P<owner>[^/]+)/(?P<gistId>[^/]+)/(?P<fileName>[^/]+)`, gist.HandleGistFile)
	m.Route(`/gist/get-file/(?P<owner>[^/]+)/(?P<gistId>[^/]+)`, gist.HandleGistFile)
	m.Route(`/gist/update/(?P<gistId>[^/]+)`, gist.HandleGistUpdate)

	return m
}

func HandleEnv(_ context.Context, ex *exchange.Exchange) {
	recaptchaSiteKey := ""
	if ex.RecaptchaConfig != nil {
		recaptchaSiteKey = ex.RecaptchaConfig.SiteKey
	}

	ex.Respond(http.StatusOK, map[string]any{
		"recaptchaSiteKey": recaptchaSiteKey,
	})
}

func (mux *Mux) Close() error {
	dbClient, ok := mux.DBClient.(io.Closer)
	if ok {
		return dbClient.Close()
	}
	return nil
}

func (mux *Mux) UseConfig(cfg config.Config) {
	mux.Config = cfg
}

func (mux *Mux) UseDBClient(client dbclient.DBClient) {
	mux.DBClient = client
}

func (mux *Mux) UseHTTPClient(client httpclient.HTTPClient) {
	mux.HTTPClient = client
}

func (mux *Mux) UseRecaptcha(projectId, siteKey, apiKey string) {
	mux.RecaptchaConfig = &exchange.RecaptchaConfig{
		ProjectId: projectId,
		SiteKey:   siteKey,
		ApiKey:    apiKey,
	}
}

func (mux *Mux) UseGitHubClient(id, secret string) {
	mux.GitHubClient = &exchange.GitHubClient{
		Id:     id,
		Secret: secret,
	}
}

func (mux *Mux) Route(pattern string, fn HandlerFn) {
	mux.Routes = append(mux.Routes, Route{
		Pattern: *regexp.MustCompile("^" + pattern + "$"),
		Fn:      fn,
	})
}

func (mux Mux) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	ctx, cancelFunc := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelFunc()

	if req.RequestURI == "*" {
		if req.ProtoAtLeast(1, 1) {
			w.Header().Set("Connection", "close")
		}
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	host := req.Header.Get("X-Forwarded-Host")
	if host == "" {
		host = req.Host
	}
	host = strings.SplitN(host, ":", 2)[0] // Remove port if present.
	if _, ok := mux.Config.AllowedHosts[host]; !ok {
		log.Printf("Host not allowed: %s", host)
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte("Host not allowed."))
		return
	}

	// Require JSON content type.
	if req.Method != http.MethodGet && getContentType(req) != "application/json" {
		w.WriteHeader(http.StatusBadRequest)
		_, err := w.Write([]byte(http.StatusText(http.StatusBadRequest)))
		if err != nil {
			log.Printf("Error writing response, when content type isn't json: %v", err)
		}
		return
	}

	ex := &exchange.Exchange{
		Request:         *req,
		ResponseWriter:  w,
		Fields:          make(map[string]string),
		Config:          mux.Config,
		DBClient:        mux.DBClient,
		HTTPClient:      mux.HTTPClient,
		GitHubClient:    mux.GitHubClient,
		RecaptchaConfig: mux.RecaptchaConfig,
	}

	var route Route
	var match []string
	for _, route = range mux.Routes {
		match = route.Pattern.FindStringSubmatch(req.URL.Path)
		if match != nil {
			break
		}
	}

	if match == nil {
		assets.HandleStatic(ctx, ex)
		return
	}

	names := route.Pattern.SubexpNames()
	for i, name := range names {
		if name != "" {
			ex.Fields[name] = match[i]
		}
	}

	route.Fn(ctx, ex)
}

func getContentType(r *http.Request) string {
	return strings.Split(r.Header.Get("Content-Type"), ";")[0]
}
