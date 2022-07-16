package main

import (
	"context"
	"github.com/sharat87/prestige/config"
	"github.com/sharat87/prestige/dbclient"
	"github.com/sharat87/prestige/httpclient"
	"github.com/sharat87/prestige/mux"
	"log"
	"net"
	"net/http"
	"os"
	"runtime/debug"
	"strings"
	"time"
)

var ( // Values injected at build time.
	Version   string
	BuildTime string
)

func main() {
	log.SetFlags(log.Ldate | log.Ltime | log.Llongfile | log.LUTC | log.Lmsgprefix)

	logMetaInformation()
	cfg := config.MustLoad()

	if cfg.BindProtocol == "unix" {
		err := os.Remove(cfg.BindTarget)
		if err != nil && !strings.HasSuffix(err.Error(), ": no such file or directory") {
			log.Printf("Error removing socket: %v", err)
		}
		defer func(t string) {
			err := os.Remove(t)
			if err != nil {
				log.Printf("Error removing socket: %v", err)
			}
		}(cfg.BindTarget)
	}

	listener, err := net.Listen(cfg.BindProtocol, cfg.BindTarget)
	if err != nil {
		log.Panicf("Error creating listener: %v", err)
	}

	m := mux.New()
	defer func(m *mux.Mux) {
		err := m.Close()
		if err != nil {
			log.Println("Error closing mux:", err)
		}
	}(m)

	if uri := os.Getenv("PRESTIGE_DATABASE_URI"); uri != "" {
		m.UseDBClient(dbclient.New(context.TODO(), uri))
	}

	m.UseConfig(cfg)

	m.UseHTTPClient(httpclient.New())

	// TODO: Prefix all environment variables with `PRESTIGE_`.
	if os.Getenv("RECAPTCHA_PROJECT_ID") != "" {
		log.Print("Recaptcha enabled")
		m.UseRecaptcha(
			os.Getenv("RECAPTCHA_PROJECT_ID"),
			os.Getenv("RECAPTCHA_SITE_KEY"),
			os.Getenv("RECAPTCHA_API_KEY"),
		)
	}

	if os.Getenv("GITHUB_CLIENT_ID") != "" {
		log.Print("Github Client enabled")
		m.UseGitHubClient(
			os.Getenv("GITHUB_CLIENT_ID"),
			os.Getenv("GITHUB_CLIENT_SECRET"),
		)
	}

	s := &http.Server{
		Handler:        m,
		ReadTimeout:    10 * time.Second,
		WriteTimeout:   10 * time.Second,
		MaxHeaderBytes: 1 << 10,
	}

	log.Printf("Serving on http://%s (%s) (set HOST / PORT environment variables to change)...", cfg.BindTarget, cfg.BindProtocol)

	err = s.Serve(listener)
	if err != nil {
		log.Panicf("Server returned error: %v", err)
	}
}

func logMetaInformation() {
	var commit string
	var isCommitClean bool

	buildInfo, ok := debug.ReadBuildInfo()
	if !ok {
		log.Println("Could not read build information")

	} else {
		for _, setting := range buildInfo.Settings {
			if setting.Key == "vcs.revision" {
				commit = setting.Value
			} else if setting.Key == "vcs.modified" {
				isCommitClean = setting.Value == "false"
			}
		}

	}

	if !isCommitClean {
		if commit != "" {
			commit += " "
		}
		commit += "(dirty)"
	}

	log.Printf("Version: %q, Commit: %q, Built: %q", Version, commit, BuildTime)
}
