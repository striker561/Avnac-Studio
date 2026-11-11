// Package avnacsecrets stores API keys using the OS credential store so that
// no plaintext secrets are written to disk by the application.
//
// On Windows this delegates to Windows Credential Manager (DPAPI-backed).
// On macOS it uses the user Keychain.
// On Linux it uses the Secret Service (libsecret / GNOME Keyring).
package avnacsecrets

import (
	"errors"
	"strings"

	"github.com/zalando/go-keyring"
)

// NewSecretsManager returns a ready-to-use SecretsManager.
const keyringSvc = "avnac"

// SecretsManager is a Wails-bound struct that exposes GetKey / SetKey /
// DeleteKey to the frontend over the IPC bridge.
type SecretsManager struct{}

// NewSecretsManager returns a ready-to-use SecretsManager.
func NewSecretsManager() *SecretsManager {
	return &SecretsManager{}
}

// GetKey retrieves the secret stored under name. Returns an empty string
// (not an error) when no value has been stored yet.
func (s *SecretsManager) GetKey(name string) (string, error) {
	val, err := keyring.Get(keyringSvc, name)
	if err != nil {
		if errors.Is(err, keyring.ErrNotFound) {
			return "", nil
		}
		return "", err
	}
	return val, nil
}

// HasKey reports whether a secret is stored under name. The frontend uses
// this to render "a key is saved" state without ever receiving the value, so
// the saved key's length is not exposed to the UI.
func (s *SecretsManager) HasKey(name string) (bool, error) {
	val, err := s.GetKey(name)
	if err != nil {
		return false, err
	}
	return strings.TrimSpace(val) != "", nil
}

// SetKey persists value under name in the OS credential store. Passing an
// empty (or whitespace-only) value is equivalent to calling DeleteKey.
func (s *SecretsManager) SetKey(name string, value string) error {
	value = strings.TrimSpace(value)
	if value == "" {
		return s.DeleteKey(name)
	}
	return keyring.Set(keyringSvc, name, value)
}

// DeleteKey removes the stored value for name. It is not an error to delete a
// key that was never set.
func (s *SecretsManager) DeleteKey(name string) error {
	err := keyring.Delete(keyringSvc, name)
	if err != nil && errors.Is(err, keyring.ErrNotFound) {
		return nil
	}
	return err
}
