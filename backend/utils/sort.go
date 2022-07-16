package utils

import "sort"

func SortHeaderTuples(tuples [][]string) {
	sort.Slice(tuples, func(i, j int) bool {
		if tuples[i][0] == tuples[j][0] {
			return sort.StringsAreSorted([]string{tuples[i][1], tuples[j][1]})
		} else {
			return sort.StringsAreSorted([]string{tuples[i][0], tuples[j][0]})
		}
	})
}
