package httpclient

import (
	"bytes"
	"fmt"
	"github.com/sharat87/prestige/utils"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"time"
)

type Request struct {
	Method  string
	URL     string
	Headers map[string]string
	Body    any
}

type Response struct {
	StatusCode int
	Body       []byte
}

type HTTPClient interface {
	Do(request Request) (*Response, error)
}

type Impl struct {
	NativeClient *http.Client
}

func New() HTTPClient {
	return &Impl{
		NativeClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (i *Impl) Do(request Request) (*Response, error) {
	log.Printf("Doing request %+v", request)
	var body io.Reader
	if request.Body != nil {
		body = bytes.NewReader(utils.ToJson(request.Body))
	}

	rawRequest, err := http.NewRequest(request.Method, request.URL, body)
	if err != nil {
		log.Printf("Error building HTTP request: %v %v", request, err)
		return nil, err
	}

	if body != nil {
		rawRequest.Header.Set("Content-Type", "application/json")
	}
	for name, value := range request.Headers {
		rawRequest.Header.Set(name, value)
	}

	rawResponse, err := i.NativeClient.Do(rawRequest)
	if err != nil {
		return nil, err
	}

	response := &Response{
		StatusCode: rawResponse.StatusCode,
	}

	responseBody, err := ioutil.ReadAll(rawResponse.Body)
	if err != nil {
		log.Printf("Error reading body from HTTP request response: %v", err)
		return response, err
	}

	response.Body = responseBody

	if rawResponse.StatusCode != http.StatusOK && rawResponse.StatusCode != http.StatusCreated {
		return response, fmt.Errorf("non-ok response %v: %v", response.StatusCode, string(response.Body))
	}

	return response, err
}
