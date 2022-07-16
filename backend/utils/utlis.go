package utils

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"io"
	"log"
	"time"
)

func GenerateRandomString() (string, error) {
	buf := new(bytes.Buffer)
	err := binary.Write(buf, binary.LittleEndian, time.Now().UnixNano())
	if err != nil {
		return "", err
	}

	b := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, b); err != nil {
		return "", err
	}

	out := buf.Bytes()
	out = append(out, b...)

	return base64.URLEncoding.EncodeToString(out), nil
}

func ParseJson(raw []byte) map[string]any {
	var data map[string]any
	if err := json.Unmarshal(raw, &data); err != nil {
		log.Printf("Error unmarshalling JSON: %v: %v", err, string(raw))
	}
	return data
}

func ToJson(data any) []byte {
	content, err := json.Marshal(data)
	if err != nil {
		log.Printf("Error marshalling data to JSON: %v: %+v", err, data)
		return nil
	}

	return content
}
