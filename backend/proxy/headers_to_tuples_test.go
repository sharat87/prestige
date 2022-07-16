package proxy

import (
	"github.com/google/go-cmp/cmp"
	"github.com/sharat87/prestige/utils"
	"testing"
)

func TestHeadersToTuples(t *testing.T) {
	got := headersToTuples(map[string][]string{
		"header-one": {"value-one"},
		"header-two": {"value-two"},
		"empty-one":  {""},
	})

	utils.SortHeaderTuples(got)

	want := [][]string{
		{"Empty-One", ""},
		{"Header-One", "value-one"},
		{"Header-Two", "value-two"},
	}

	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("headersToTuples() returned diff: %s", diff)
	}
}

func TestHeadersToTuplesRepeated(t *testing.T) {
	got := headersToTuples(map[string][]string{
		"header-one": {"value-one", "another-one-value"},
		"header-two": {"value-two"},
		"empty-one":  {""},
	})

	utils.SortHeaderTuples(got)

	want := [][]string{
		{"Empty-One", ""},
		{"Header-One", "another-one-value"},
		{"Header-One", "value-one"},
		{"Header-Two", "value-two"},
	}

	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("headersToTuples() returned diff: %s", diff)
	}
}
