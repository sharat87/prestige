package proxy

import (
	"github.com/google/go-cmp/cmp"
	"testing"
)

func TestHeadersToMap(t *testing.T) {
	got := headersToMap([][]string{
		{"header-one", "value-one"},
		{"header-two", "value-two"},
		{"empty-one", ""},
	})

	want := map[string][]string{
		"Header-One": {"value-one"},
		"Header-Two": {"value-two"},
		"Empty-One":  {""},
	}

	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("headersToMap() returned diff: %s", diff)
	}
}

func TestHeadersToMapDuplicatedEntries(t *testing.T) {
	got := headersToMap([][]string{
		{"header-one", "value-one"},
		{"header-one", "one-again"},
	})

	want := map[string][]string{
		"Header-One": {"value-one", "one-again"},
	}

	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("headersToMap() returned diff: %s", diff)
	}
}
