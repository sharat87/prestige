package utils

import (
	"testing"
)

func TestEncryptAndDecrypt(t *testing.T) {
	key := *(*[32]byte)([]byte("a secret with exactly `32` bytes"))

	originalText := "hello world!"
	cipherText, _ := Encrypt(key, originalText)
	plainText, _ := Decrypt(key, cipherText)

	if plainText != originalText {
		t.Errorf("want %q, but got %q", originalText, plainText)
	}
}

func TestDjangoPasswordHashCheck(t *testing.T) {
	err := CheckHashAndPassword(
		[]byte("pbkdf2_sha256$260000$YXWy5tq9zwhY2Pkm0rVgp5$fVeZHT+dGq1wGRQUfvjGExyrhkm4CSOy33qgs6X2aps="),
		[]byte("super-creepy-password"),
	)
	if err != nil {
		t.Errorf("CheckPassword for Django password failed %v", err)
	}
}
