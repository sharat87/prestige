package assets

import (
	"context"
	"embed"
	"github.com/sharat87/prestige/exchange"
	"log"
	"mime"
	"net/http"
	"strings"
	"text/template"
)

// The static folder contains frontend build artifacts.
//go:embed *
var assets embed.FS

var embeddedTemplates = loadTemplates()

func loadTemplates() *template.Template {
	tpl, err := template.ParseFS(assets, "embeds/*.tmpl")
	if err != nil {
		log.Fatalf("Error parsing templates: %v", err)
	}
	return tpl
}

func RenderToString(name string, data any) string {
	var rendered strings.Builder

	if err := embeddedTemplates.ExecuteTemplate(&rendered, "embeds/"+name, data); err != nil {
		log.Fatalf("Error executing %q template %v.", name, err)
	}

	return rendered.String()
}

func GetAssetString(name string) string {
	content, err := assets.ReadFile("embeds/" + name)
	if err != nil {
		log.Fatalf("Error reading %q asset: %v", name, err)
	}
	return string(content)
}

func RenderGistReadme(data any) string {
	return RenderToString("gist-readme.md.tmpl", data)
}

func HandleStatic(_ context.Context, ex *exchange.Exchange) {
	file := ex.Request.URL.Path

	// If it's a path like `/` or `/docs/`, then add an `index.html` at the end.
	if strings.HasSuffix(file, "/") {
		file += "index.html"
	}
	file = strings.TrimPrefix(file, "/")

	file = "static/" + file
	err := WriteAsset(file, ex.ResponseWriter, ex.Request)
	if err != nil {
		ex.RespondError(http.StatusNotFound, "not-found", "Not found")
	}
}

func WriteAsset(name string, w http.ResponseWriter, request http.Request) error {
	if content, err := assets.ReadFile(name); err == nil {
		parts := strings.Split(name, ".")
		extension := parts[len(parts)-1]
		contentType := mime.TypeByExtension("." + extension)
		if contentType != "" {
			w.Header().Set("Content-Type", contentType)
		}

		if _, err := w.Write(content); err != nil {
			log.Printf("Error writing asset content %v", err)
			return err
		}

	} else {
		if strings.HasSuffix(err.Error(), " is a directory") {
			parts := strings.Split(name, "/")
			http.Redirect(w, &request, "./"+parts[len(parts)-1]+"/", http.StatusPermanentRedirect)
		} else if !strings.HasSuffix(err.Error(), " file does not exist") {
			log.Printf("Error responding to static file: %v", err)
		}
		return err

	}

	return nil
}
