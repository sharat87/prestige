package exchange

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/sharat87/prestige/config"
	"github.com/sharat87/prestige/dbclient"
	"github.com/sharat87/prestige/httpclient"
	"github.com/sharat87/prestige/utils"
	"log"
	"net/http"
	"time"
)

type Exchange struct {
	Request         http.Request
	ResponseWriter  http.ResponseWriter
	Fields          map[string]string
	Config          config.Config
	DBClient        dbclient.DBClient
	HTTPClient      httpclient.HTTPClient
	Session         *dbclient.SessionDTO
	SessionManager  dbclient.SessionManager
	RecaptchaConfig *RecaptchaConfig
	GitHubClient    *GitHubClient
}

type RecaptchaConfig struct {
	// ProjectId From <https://console.cloud.google.com/iam-admin/settings>.
	ProjectId string
	// SiteKey From <https://console.cloud.google.com/security/recaptcha>.
	SiteKey string
	// ApiKey From <https://console.cloud.google.com/apis/credentials>.
	ApiKey string
}

type GitHubClient struct {
	Id     string
	Secret string
}

func (ex Exchange) DecodeBody(data any) error {
	d := json.NewDecoder(ex.Request.Body)
	d.DisallowUnknownFields()
	return d.Decode(&data)
}

func (ex Exchange) Respond(statusCode int, data any) {
	ex.ResponseWriter.WriteHeader(statusCode)
	ex.ResponseWriter.Header().Set("Content-Type", "application/json")
	err := json.NewEncoder(ex.ResponseWriter).Encode(data)
	if err != nil {
		log.Printf("Error writing JSON response: %v", err)
		_, _ = ex.ResponseWriter.Write([]byte(fmt.Sprintf(`{"error": %q}`, err)))
		return
	}
}

func (ex Exchange) RespondErrorDeprecated(statusCode int, err error) {
	ex.Respond(statusCode, map[string]any{
		"error": err.Error(),
	})
}

func (ex Exchange) RespondError(statusCode int, code, message string) {
	ex.Respond(statusCode, map[string]any{
		"error": map[string]string{
			"code":    code,
			"message": message,
		},
	})
}

func (ex Exchange) RequireMethod(method string) error {
	if ex.Request.Method != method {
		err := errors.New(fmt.Sprintf("Invalid method %v", ex.Request.Method))
		ex.RespondErrorDeprecated(http.StatusMethodNotAllowed, err)
		return err
	}
	return nil
}

func (ex Exchange) HTTPDo(request httpclient.Request) (*httpclient.Response, error) {
	return ex.HTTPClient.Do(request)
}

func (ex *Exchange) InitSession(ctx context.Context) *dbclient.SessionDTO {
	cookie, err := ex.Request.Cookie("prestige_sid")
	sid := ""

	if err == nil && cookie.Value != "" {
		sid = cookie.Value
		ex.Session = ex.DBClient.FindSession(ctx, sid)
	}

	if err != nil && err != http.ErrNoCookie {
		log.Printf("Error getting prestige_sid cookie: %v", err)
	}

	if ex.Session == nil || ex.Session.Sid == "" {
		sid, err := utils.GenerateRandomString()
		if err != nil {
			log.Printf("Error generating random string: %v", err)
		}

		ex.Session = &dbclient.SessionDTO{
			Sid: sid,
		}

		// TODO: See if we can get away with not saving a session for every user right away.
		err = ex.DBClient.CreateSession(ctx, *ex.Session)
		if err != nil {
			log.Printf("Error saving session: %v", err)
		}

		cookie = &http.Cookie{
			Name:  "prestige_sid",
			Value: sid,
		}
	}

	go ex.PushExpiry(context.Background())

	cookie.Path = "/" // Without this, it gets the current request's path instead.
	cookie.Expires = time.Now().Add(time.Hour * 24 * 7)
	cookie.HttpOnly = true
	//cookie.SameSite = http.SameSiteStrictMode
	// cookie.Secure = true // TODO: Detect if user is on HTTPS, and set this accordingly.
	http.SetCookie(ex.ResponseWriter, cookie)

	//ex.SessionManager = &dbclient.SessionManagerImpl{
	//	Sid: sid,
	//	DB:  ex.DBClient,
	//}

	return ex.Session
}

func (ex Exchange) SetSessionUser(ctx context.Context, email string) {
	err := ex.DBClient.UpdateSession(ctx, ex.Session.Sid, map[string]any{
		"email": email,
	})
	if err != nil {
		log.Printf("Error setting email in session: %q; %v", ex.Session.Sid, err)
	}
	ex.Session.Email = email
}

func (ex Exchange) SaveSessionGithubAuthState(ctx context.Context, state string) {
	err := ex.DBClient.UpdateSession(ctx, ex.Session.Sid, map[string]any{
		"githubAuthState": state,
	})
	if err != nil {
		log.Printf("Error setting githubAuthState in session: %q; %v", ex.Session.Sid, err)
	}
	ex.Session.GithubAuthState = state
}

func (ex Exchange) PushExpiry(ctx context.Context) {
	expiresAt := time.Now().Add(time.Hour * 24 * 7)
	err := ex.DBClient.UpdateSession(ctx, ex.Session.Sid, map[string]any{
		"expiresAt": expiresAt,
	})
	if err != nil {
		log.Printf("Error setting expiresAt in session: %q; %v", ex.Session.Sid, err)
	}
	ex.Session.ExpiresAt = expiresAt
}

func (ex Exchange) ClearUserInSession(ctx context.Context) {
	ex.SetSessionUser(ctx, "")
}

func (ex Exchange) IsAddressAllowedForProxy(address string) bool {
	return utils.IsAddressAllowed(address, ex.Config.ProxyDisallowedHosts, ex.Config.ProxyDisallowedPrefixes)
}
