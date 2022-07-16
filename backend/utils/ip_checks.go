package utils

import "net/netip"

func IsAddressAllowed(address string, disallowedHosts map[string]any, disallowedNetworks []netip.Prefix) bool {
	if address == "" {
		return false
	}

	if _, ok := disallowedHosts[address]; ok {
		return false
	}

	ip, err := netip.ParseAddr(address)
	if err != nil {
		// Not an IP address, so it's probably a hostname, allow it.
		return true
	}

	for _, prefix := range disallowedNetworks {
		if prefix.Contains(ip) {
			return false
		}
	}

	return true
}
