package utils

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/crypto/pbkdf2"
	"io"
	"strconv"
)

var bcryptHashPrefix = []byte("bcrypt$")
var pbkdf2SHA256Prefix = []byte("pbkdf2_sha256$") // Prefix used by Django.

// Encrypt encrypts data using 256-bit AES-GCM.  This both hides the content of
// the data and provides a check that it hasn't been altered. Output takes the
// form nonce|ciphertext|tag where '|' indicates concatenation.
// Originally taken from: <https://github.com/gtank/cryptopasta/blob/master/encrypt.go>.
func Encrypt(key [32]byte, plainText string) (cipherText []byte, err error) {
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, gcm.NonceSize())
	_, err = io.ReadFull(rand.Reader, nonce)
	if err != nil {
		return nil, err
	}

	return gcm.Seal(nonce, nonce, []byte(plainText), nil), nil
}

// Decrypt decrypts data using 256-bit AES-GCM.  This both hides the content of
// the data and provides a check that it hasn't been altered. Expects input
// form nonce|ciphertext|tag where '|' indicates concatenation.
func Decrypt(key [32]byte, cipherText []byte) (plainText string, err error) {
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()

	if len(cipherText) < nonceSize {
		return "", errors.New("malformed ciphertext")
	}

	plain, err := gcm.Open(nil, cipherText[:nonceSize], cipherText[nonceSize:], nil)
	if err != nil {
		return "", err
	}

	return string(plain), nil
}

func GenerateHash(data string) ([]byte, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(data), 14)
	if err != nil {
		return nil, err
	}

	return append([]byte("bcrypt$"), hash...), err
}

func CheckHashAndPassword(hash, password []byte) error {
	if bytes.HasPrefix(hash, pbkdf2SHA256Prefix) {
		// Structure of Django password hash values: <https://docs.djangoproject.com/en/4.0/topics/auth/passwords/#how-django-stores-passwords>.
		// We have `algorithm$iterations$salt$hash`.
		parts := bytes.SplitN(hash, []byte("$"), 4)
		iterationCount, _ := strconv.Atoi(string(parts[1]))

		hashValue := pbkdf2.Key(password, parts[2], iterationCount, sha256.Size, sha256.New)

		encodedHash := make([]byte, base64.StdEncoding.EncodedLen(len(hashValue)))
		base64.StdEncoding.Encode(encodedHash, hashValue)

		if subtle.ConstantTimeCompare(parts[3], encodedHash) == 0 {
			return errors.New("invalid password " + string(encodedHash))
		}

		return nil

	} else if bytes.HasPrefix(hash, bcryptHashPrefix) {
		return bcrypt.CompareHashAndPassword(bytes.TrimPrefix(hash, bcryptHashPrefix), password)

	} else {
		return errors.New("invalid hash")

	}
}
