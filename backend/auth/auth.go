package auth

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/sharat87/prestige/dbclient"
	"github.com/sharat87/prestige/exchange"
	"github.com/sharat87/prestige/httpclient"
	"github.com/sharat87/prestige/utils"
	"log"
	"net/http"
	"strings"
)

type RecaptchaResponse struct {
	Name  string `json:"name"`
	Event struct {
		Token           string `json:"token"`
		SiteKey         string `json:"siteKey"`
		UserAgent       string `json:"userAgent"`
		UserIpAddress   string `json:"userIpAddress"`
		ExpectedAction  string `json:"expectedAction"`
		HashedAccountId string `json:"hashedAccountId"`
	} `json:"event"`
	Score           float32 `json:"score"`
	TokenProperties struct {
		Valid         bool   `json:"valid"`
		InvalidReason string `json:"invalidReason"`
		Hostname      string `json:"hostname"`
		Action        string `json:"action"`
		CreateTime    string `json:"createTime"`
	} `json:"tokenProperties"`
}

func HandleRegister(ctx context.Context, ex *exchange.Exchange) {
	if ex.RequireMethod(http.MethodPost) != nil {
		return
	}
	ex.InitSession(ctx)

	// TODO: Validate email address.
	registerDTO := struct {
		Email          string
		Password       string
		RecaptchaToken string
	}{}

	err := ex.DecodeBody(&registerDTO)
	if err != nil {
		log.Printf("Error decoding register payload: %v", err)
		ex.RespondErrorDeprecated(http.StatusBadRequest, err)
		return
	}

	if len(registerDTO.Email) < 3 {
		ex.RespondErrorDeprecated(http.StatusBadRequest, errors.New("email too small, min 3 characters"))
		return
	}

	if len(registerDTO.Email) > 150 {
		ex.RespondErrorDeprecated(http.StatusBadRequest, errors.New("email too long, max 150 characters"))
		return
	}

	if len(registerDTO.Password) < 4 {
		ex.RespondErrorDeprecated(http.StatusBadRequest, errors.New("password too small, min 4 characters"))
		return
	}

	if len(registerDTO.Password) > 150 {
		ex.RespondErrorDeprecated(http.StatusBadRequest, errors.New("password too long, max 150 characters"))
		return
	}

	if ex.RecaptchaConfig != nil {
		if len(registerDTO.RecaptchaToken) < 4 {
			ex.RespondErrorDeprecated(http.StatusBadRequest, errors.New("recaptchaToken too small, min 4 characters"))
			return
		}

		if len(registerDTO.RecaptchaToken) > 2000 {
			// This is usually 1500-1600 characters in length.
			ex.RespondErrorDeprecated(http.StatusBadRequest, errors.New("recaptchaToken too long, max 2000 characters"))
			return
		}

		response, err := ex.HTTPDo(httpclient.Request{
			Method: http.MethodPost,
			URL:    "https://recaptchaenterprise.googleapis.com/v1beta1/projects/" + ex.RecaptchaConfig.ProjectId + "/assessments?key=" + ex.RecaptchaConfig.ApiKey,
			Body: map[string]any{
				"event": map[string]any{
					"token":          registerDTO.RecaptchaToken,
					"siteKey":        ex.RecaptchaConfig.SiteKey,
					"expectedAction": "SIGNUP",
				},
			},
		})
		if err != nil {
			log.Printf("Error doing recaptcha verification request: %v %v", err, response)
			ex.RespondErrorDeprecated(http.StatusUnauthorized, err)
			return
		}

		data := RecaptchaResponse{}
		err = json.Unmarshal(response.Body, &data)
		if err != nil {
			log.Printf("Error unmarshalling response body from recaptcha verification request: %v %v", err, string(response.Body))
			ex.RespondErrorDeprecated(http.StatusUnauthorized, errors.New("recaptcha verification failed"))
			return
		}

		if !data.TokenProperties.Valid || data.TokenProperties.Action != "SIGNUP" {
			ex.RespondErrorDeprecated(http.StatusUnauthorized, errors.New("recaptcha verification failed"))
			return
		}
	}

	passwordHash, err := utils.GenerateHash(registerDTO.Password)
	if err != nil {
		ex.RespondErrorDeprecated(http.StatusInternalServerError, err)
		return
	}

	err = ex.DBClient.CreateUser(ctx, dbclient.User{
		Email:           registerDTO.Email,
		Password:        passwordHash,
		IsEmailVerified: false,
	})
	if err != nil {
		if strings.Contains(err.Error(), "E11000 duplicate key error collection") {
			ex.RespondError(http.StatusConflict, "err-email-already-exists", "Account with email already exists")
		} else {
			log.Printf("Error inserting user to MongoDB: %v", err)
			ex.RespondError(http.StatusInternalServerError, "err-creating-user", "Error creating user")
		}
		return
	}

	ex.SetSessionUser(ctx, registerDTO.Email)

	ex.Respond(http.StatusCreated, map[string]any{
		"user": map[string]any{
			"email":             registerDTO.Email,
			"isGitHubConnected": false,
		},
	})
}

func HandleLogin(ctx context.Context, ex *exchange.Exchange) {
	if ex.RequireMethod(http.MethodPost) != nil {
		return
	}
	ex.InitSession(ctx)

	loginDTO := struct {
		Email          string
		Password       string
		RecaptchaToken string
	}{}

	err := ex.DecodeBody(&loginDTO)
	if err != nil {
		log.Printf("Error decoding login payload: %v", err)
		ex.RespondErrorDeprecated(http.StatusBadRequest, err)
		return
	}

	foundUser, err := ex.DBClient.FindUserByEmail(ctx, loginDTO.Email)
	if err != nil {
		ex.RespondErrorDeprecated(http.StatusUnauthorized, errors.New("incorrect login details"))
		return
	}

	err = utils.CheckHashAndPassword(foundUser.Password, []byte(loginDTO.Password))
	if err != nil {
		ex.RespondErrorDeprecated(http.StatusUnauthorized, errors.New("incorrect login details"))
		return
	}

	ex.SetSessionUser(ctx, loginDTO.Email)

	ex.Respond(http.StatusOK, map[string]any{
		"user": map[string]any{
			"email":             loginDTO.Email,
			"isGitHubConnected": foundUser.Github != nil,
		},
	})
}

func HandleLogout(ctx context.Context, ex *exchange.Exchange) {
	if ex.RequireMethod(http.MethodPost) != nil {
		return
	}
	ex.InitSession(ctx)

	ex.ClearUserInSession(ctx)

	ex.Respond(http.StatusOK, map[string]any{
		"ok": true,
	})
}

func HandleProfile(ctx context.Context, ex *exchange.Exchange) {
	if ex.RequireMethod(http.MethodGet) != nil {
		return
	}
	session := ex.InitSession(ctx)

	if session.Email == "" {
		ex.RespondErrorDeprecated(http.StatusUnauthorized, errors.New("unauthorized"))
		return
	}

	foundUser, err := ex.DBClient.FindUserByEmail(ctx, session.Email)
	if err != nil {
		ex.RespondErrorDeprecated(http.StatusUnauthorized, errors.New("unauthorized"))
		return
	}

	ex.Respond(http.StatusOK, map[string]any{
		"user": map[string]any{
			"email":             session.Email,
			"isGitHubConnected": foundUser.Github != nil && foundUser.Github.AccessToken != nil,
		},
	})
}
