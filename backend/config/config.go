package config

import (
	"encoding/base64"
	"log"
	"net/netip"
	"os"
	"strings"
)

type Config struct {
	BindTarget              string
	AllowedHosts            map[string]any // A set of hostnames.
	EncryptionKey           [32]byte
	ProxyDisallowedHosts    map[string]any // A set of hostnames/IPAddresses.
	ProxyDisallowedPrefixes []netip.Prefix
}

func MustLoad() Config {
	target := loadBindTarget()
	hosts, prefixes := loadProxyDisallowedHosts()
	return Config{
		BindTarget:              target,
		AllowedHosts:            loadAllowedHosts(),
		EncryptionKey:           *(*[32]byte)(loadEncryptionKey()),
		ProxyDisallowedHosts:    hosts,
		ProxyDisallowedPrefixes: prefixes,
	}
}

func loadBindTarget() string {
	if port, ok := os.LookupEnv("PORT"); ok {
		return ":" + port
	} else {
		return ":3041"
	}
}

func loadAllowedHosts() map[string]any {
	allowedHosts := map[string]any{}
	for _, host := range strings.Split(os.Getenv("PRESTIGE_ALLOWED_HOSTS"), ",") {
		host = strings.TrimSpace(host)
		if host != "" {
			allowedHosts[host] = nil
		}
	}

	if len(allowedHosts) == 0 {
		allowedHosts["localhost"] = nil
		allowedHosts["127.0.0.1"] = nil
	}

	return allowedHosts
}

func loadEncryptionKey() []byte {
	encryptionKey, err := base64.StdEncoding.DecodeString(strings.TrimSpace(os.Getenv("PRESTIGE_SECRET_KEY")))
	if err != nil {
		log.Fatalf("Error decoding PRESTIGE_SECRET_KEY: %v", err)
	}

	if len(encryptionKey) != 32 {
		log.Fatalf("PRESTIGE_SECRET_KEY should be exactly 32 bytes in length, but is %d bytes.", len(encryptionKey))
	}

	return encryptionKey
}

func loadProxyDisallowedHosts() (map[string]any, []netip.Prefix) {
	disallowedConfig := os.Getenv("PRESTIGE_PROXY_DISALLOWED_HOSTS")
	if disallowedConfig == "" {
		// Private Network IP ranges <https://en.wikipedia.org/wiki/Private_network>.
		disallowedConfig = "10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fd00::/8"
		// Localhost.
		disallowedConfig += ", localhost, 0.0.0.0/32, 127.0.0.1/32, [::]"
		// EC2 Instance Metadata endpoints.
		disallowedConfig += ", 169.254.169.254/32, [fd00:ec2::254]"
	}

	proxyDisallowedHosts := map[string]any{}

	var proxyDisallowedPrefixes []netip.Prefix

	for _, entry := range strings.Split(disallowedConfig, ",") {
		prefix, err := netip.ParsePrefix(entry)
		if err != nil {
			proxyDisallowedHosts[entry] = nil
		} else {
			proxyDisallowedPrefixes = append(proxyDisallowedPrefixes, prefix)
		}
	}

	return proxyDisallowedHosts, proxyDisallowedPrefixes
}
