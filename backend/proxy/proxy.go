package proxy

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"github.com/sharat87/prestige/cookies"
	"github.com/sharat87/prestige/exchange"
	"github.com/sharat87/prestige/utils"
	"io"
	"io/ioutil"
	"log"
	"mime/multipart"
	"net"
	"net/http"
	"net/textproto"
	"strings"
	"time"
)

type (
	Job struct {
		Id       string
		Method   string
		URL      string
		Headers  [][]string // List of two-tuples of header name and value.
		Cookies  map[string]map[string]map[string]cookies.CookieValue
		Body     string
		BodyType string `json:"bodyType"`
		Timeout  int
	}

	Response struct {
		Id       string                                               `json:"id"`
		Response *RealisedResponse                                    `json:"response"`
		History  []*RealisedResponse                                  `json:"history"`
		Cookies  map[string]map[string]map[string]cookies.CookieValue `json:"cookies"`
		Error    *Error                                               `json:"error,omitempty"`
	}

	RealisedResponse struct {
		URL        string          `json:"url"`
		StatusCode int             `json:"status"`
		StatusText string          `json:"statusText"`
		Headers    [][]string      `json:"headers"`
		Body       string          `json:"body"`
		Request    RealisedRequest `json:"request"`
	}

	RealisedRequest struct {
		Method  string     `json:"method"`
		Headers [][]string `json:"headers"`
		Body    string     `json:"body"`
	}

	Error struct {
		Message string `json:"message"`
	}
)

func HandleProxy(_ context.Context, ex *exchange.Exchange) {
	if ex.Request.Method == http.MethodGet {
		http.Redirect(ex.ResponseWriter, &ex.Request, "./docs/guides/proxy/", http.StatusMovedPermanently)
		return
	} else if ex.Request.Method != http.MethodPost {
		ex.RespondError(
			http.StatusBadRequest,
			"invalid-method-for-proxy",
			"Invalid method for proxy",
		)
		return
	}

	job := Job{}
	err := ex.DecodeBody(&job)
	if err != nil {
		log.Printf("Error decoding proxy payload: %v", err)
		ex.RespondError(
			http.StatusBadRequest,
			"error-decoding-proxy-payload",
			"Error decoding proxy payload",
		)
		return
	}

	jar, err := cookies.NewExportableCookieJar(job.Cookies)
	if err != nil {
		log.Printf("Error creating cookie jar: %v", err)
		ex.RespondError(
			http.StatusInternalServerError,
			"error-creating-cookie-jar-in-proxy",
			"Error creating cookie jar",
		)
		return
	}

	var history []*RealisedResponse

	client := &http.Client{
		Transport: makeTransport(ex),
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) > 9 {
				log.Println("Too many redirects, ending")
				return http.ErrUseLastResponse
			}
			history = append(history, RealiseResponse(req.Response))
			return nil
		},
		Jar:     jar,
		Timeout: 10 * time.Second,
	}

	overrideContentType := ""
	var requestBody io.Reader

	if job.BodyType == "multipart/form-data" {
		body := utils.ParseJson([]byte(job.Body))
		var b bytes.Buffer
		w := multipart.NewWriter(&b)

		for key, value := range body {
			if value == nil {
				value = "null"
			}
			// TODO: Change the data structure so it's friendly to static typing here.
			if valueDict, ok := value.(map[string]any); ok {
				formFile, err := CreateFormFile(w, key, valueDict["name"].(string), valueDict["type"].(string))
				if err != nil {
					log.Printf("Error creating form file: %v", err)
					return
				}
				decodedFileBody, err := base64.StdEncoding.DecodeString(valueDict["body"].(string))
				if err != nil {
					log.Printf("Error decoding file body: %v", err)
					ex.RespondError(http.StatusBadRequest, "error-decoding-file-body", "Error decoding file body")
					return
				}
				_, err = formFile.Write(decodedFileBody)
				if err != nil {
					log.Printf("Error writing file body: %v", err)
					return
				}
			} else if valueStr, ok := value.(string); ok {
				err := w.WriteField(key, valueStr)
				if err != nil {
					log.Printf("Error writing field: %v", err)
					return
				}
			} else {
				log.Printf("Error: unsupported value type for field %s: %T :: %#v", key, value, value)
			}
		}

		err := w.Close()
		if err != nil {
			log.Printf("Error closing multipart writer: %v", err)
			return
		}

		requestBody = &b
		overrideContentType = w.FormDataContentType()

	} else {
		requestBody = bytes.NewReader([]byte(job.Body))

	}

	jobRequest, err := http.NewRequest(job.Method, job.URL, requestBody)
	if err != nil {
		log.Printf("Error creating request: %v", err)
		ex.RespondError(
			http.StatusInternalServerError,
			"error-creating-request-from-job",
			"Error creating request from job",
		)
		return
	}

	jobRequest.Header = headersToMap(job.Headers)
	if overrideContentType != "" {
		jobRequest.Header.Set("Content-Type", overrideContentType)
	}

	response, err := client.Do(jobRequest)
	if err != nil {
		ex.Respond(http.StatusOK, Response{
			Id: job.Id,
			Error: &Error{
				Message: err.Error(),
			},
		})
		return
	}

	finalResponse := RealiseResponse(response)
	var oldestResponse *RealisedResponse
	if len(history) > 0 {
		oldestResponse = history[0]
	} else {
		oldestResponse = finalResponse
	}

	if oldestResponse != nil {
		// TODO: This should be requestBody instead.
		oldestResponse.Request.Body = job.Body
	}

	ex.Respond(http.StatusOK, Response{
		Id:       job.Id,
		Response: finalResponse,
		History:  history,
		Cookies:  jar.ToPlain(),
	})
}

func RealiseResponse(response *http.Response) *RealisedResponse {
	if response == nil {
		return nil
	}

	bodyString := ""

	defer func(Body io.ReadCloser) {
		err := Body.Close()
		if err != nil {
			log.Printf("Error closing proxied request's response body: %v", err)
		}
	}(response.Body)

	bodyBytes, err := ioutil.ReadAll(response.Body)
	if err != nil {
		log.Printf("Error reading body: %v\n", err)
	} else {
		bodyString = string(bodyBytes)
	}

	return &RealisedResponse{
		URL:        response.Request.URL.String(),
		StatusCode: response.StatusCode,
		StatusText: response.Status,
		Headers:    headersToTuples(response.Header),
		Body:       bodyString,
		Request: RealisedRequest{
			Method:  response.Request.Method,
			Headers: headersToTuples(response.Request.Header),
		},
	}
}

func makeTransport(ex *exchange.Exchange) *http.Transport {
	// TODO: Reuse transports, so connections can be reused.
	dialer := net.Dialer{
		Timeout:   30 * time.Second,
		KeepAlive: 30 * time.Second,
	}

	dialContext := func(ctx context.Context, network, address string) (net.Conn, error) {
		if network != "tcp" {
			return nil, errors.New("unsupported network")
		}

		host, _, err := net.SplitHostPort(address)
		if err != nil {
			return nil, err
		}

		if !ex.IsAddressAllowedForProxy(host) {
			return nil, errors.New("this host is not allowed")
		}

		// Solution inspired by <https://github.com/golang/go/issues/12503#issuecomment-462402881>.
		// We hopefully should have a better solution once the above issue is resolved.
		// TODO: Since we attempt to connect before checking if that IP is allowed, we end up spending timeout seconds
		// 	 to connect to IPs that aren't listening, and are not allowed.
		conn, err := dialer.DialContext(ctx, network, address)

		if err == nil {
			// If a connection could be established, ensure it's not in the disallowed list.
			ip := conn.RemoteAddr().(*net.TCPAddr).IP.String()
			if strings.Contains(ip, ":") {
				// IPv6
				ip = "[" + ip + "]"
			}

			if !ex.IsAddressAllowedForProxy(ip) {
				err := conn.Close()
				if err != nil {
					log.Printf("Error closing connection, created for disallowed host: %v", err)
				}
				return nil, errors.New("this resolved host is not allowed")
			}
		}

		return conn, err
	}

	return &http.Transport{
		Proxy:                 http.ProxyFromEnvironment,
		DialContext:           dialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          100,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}
}

func headersToTuples(headersMap map[string][]string) [][]string {
	var tuples [][]string
	for name, values := range headersMap {
		for _, value := range values {
			tuples = append(tuples, []string{http.CanonicalHeaderKey(name), value})
		}
	}
	return tuples
}

func headersToMap(headersTuples [][]string) map[string][]string {
	asMap := map[string][]string{}

	for _, tuple := range headersTuples {
		name := http.CanonicalHeaderKey(tuple[0])
		if asMap[name] == nil {
			asMap[name] = []string{}
		}
		asMap[name] = append(asMap[name], tuple[1])
	}

	return asMap
}

var quoteEscaper = strings.NewReplacer("\\", "\\\\", `"`, "\\\"")

func escapeQuotes(s string) string {
	return quoteEscaper.Replace(s)
}

// CreateFormFile Copied from `mime.multipart.writer.CreateFormFile`, because it hard-coded the content-type.
// This should improve with <https://github.com/golang/go/issues/46771>.
func CreateFormFile(w *multipart.Writer, fieldName, fileName, contentType string) (io.Writer, error) {
	h := make(textproto.MIMEHeader)
	h.Set(
		"Content-Disposition",
		fmt.Sprintf(`form-data; name="%s"; filename="%s"`, escapeQuotes(fieldName), escapeQuotes(fileName)),
	)
	h.Set("Content-Type", contentType)
	return w.CreatePart(h)
}
