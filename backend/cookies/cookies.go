package cookies

import (
	"golang.org/x/net/publicsuffix"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"sync"
	"time"
)

type CookieValue struct {
	Value   string     `json:"value"`
	Expires *time.Time `json:"expires"`
	Secure  bool       `json:"secure"`
}

func NewExportableCookieJar(plain map[string]map[string]map[string]CookieValue) (*ExportableCookieJar, error) {
	realJar, err := cookiejar.New(&cookiejar.Options{PublicSuffixList: publicsuffix.List})
	if err != nil {
		return nil, err
	}

	jar := &ExportableCookieJar{jar: realJar}

	for domain, byDomain := range plain {
		for path, byPath := range byDomain {
			var cookies []*http.Cookie
			for name, value := range byPath {
				var expires time.Time
				if value.Expires != nil {
					expires = *value.Expires
				}
				cookies = append(cookies, &http.Cookie{
					Name:    name,
					Value:   value.Value,
					Expires: expires,
					Secure:  value.Secure,
				})
			}
			jar.SetCookies(&url.URL{
				Scheme: "http", // TODO: Get the accurate scheme here.
				Host:   domain,
				Path:   path,
			}, cookies)
		}
	}

	return jar, nil
}

func (jar *ExportableCookieJar) SetCookies(u *url.URL, cookies []*http.Cookie) {
	jar.Lock()
	defer jar.Unlock()
	jar.urls = append(jar.urls, *u)
	jar.jar.SetCookies(u, cookies)
}

func (jar *ExportableCookieJar) Cookies(u *url.URL) []*http.Cookie {
	return jar.jar.Cookies(u)
}

func (jar *ExportableCookieJar) ToPlain() map[string]map[string]map[string]CookieValue {
	jar.RLock()
	defer jar.RUnlock()

	plain := map[string]map[string]map[string]CookieValue{}
	for _, u := range jar.urls {
		for _, cookie := range jar.Cookies(&u) {
			domain := cookie.Domain
			if domain == "" {
				domain = u.Host
			}

			path := cookie.Path
			if path == "" {
				path = "/"
			}

			if _, ok := plain[domain]; !ok {
				plain[domain] = map[string]map[string]CookieValue{}
			}
			if _, ok := plain[domain][path]; !ok {
				plain[domain][path] = map[string]CookieValue{}
			}

			var expires *time.Time
			if cookie.RawExpires != "" {
				expires = &cookie.Expires
			}

			plain[domain][path][cookie.Name] = CookieValue{
				Value:   cookie.Value,
				Expires: expires,
				Secure:  cookie.Secure,
			}
		}
	}

	if len(plain) == 0 {
		return nil
	}

	return plain
}

type ExportableCookieJar struct {
	jar  *cookiejar.Jar
	urls []url.URL
	sync.RWMutex
}
