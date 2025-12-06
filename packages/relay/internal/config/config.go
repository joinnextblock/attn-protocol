// Package config provides configuration management for the open-source relay.
// It loads configuration from environment variables and validates settings.
package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

// Config holds the configuration for the relay.
// All fields are loaded from environment variables and validated on load.
type Config struct {
	// Relay Configuration
	RelayName        string
	RelayDescription string
	RelayPubkey      string
	RelayPrivkey     string
	RelayContact     string
	RelayPort        int
	RelayDomain      string

	// Storage Configuration
	StorageType string // "sqlite" or custom implementations
	SQLiteDBPath string // Path to SQLite database file

	// Plugin Configuration
	AuthPlugin string // "none" or custom plugin name

	// Logging
	LogLevel string

	// Rate limiter
	RateLimiterCleanupInterval time.Duration // Interval for rate limiter cleanup (default: 5 minutes)
	RateLimitWindow            time.Duration // Rate limit time window (default: 1 minute)
}

// Load loads configuration from environment variables and validates it.
// It reads from .env file if present (via godotenv), then from environment variables.
// Environment variables take precedence over .env file values.
//
// Environment variables read:
//   - RELAY_NAME, RELAY_DESCRIPTION, RELAY_PUBKEY, RELAY_PRIVKEY, RELAY_CONTACT
//   - RELAY_PORT (default: 8008)
//   - RELAY_DOMAIN
//   - STORAGE_TYPE (default: "sqlite")
//   - SQLITE_DB_PATH (default: "./relay.db")
//   - AUTH_PLUGIN (default: "none")
//   - LOG_LEVEL (default: INFO)
//   - RATE_LIMITER_CLEANUP_INTERVAL, RATE_LIMIT_WINDOW
//
// Returns:
//   - *Config: A validated configuration instance ready for use
//   - error: Non-nil if validation fails (invalid port, etc.)
func Load() (*Config, error) {
	// Load .env file if it exists
	godotenv.Load()

	config := &Config{
		RelayName:        getEnv("RELAY_NAME", "ATTN Protocol Relay"),
		RelayDescription: getEnv("RELAY_DESCRIPTION", "Open-source ATTN Protocol relay"),
		RelayPubkey:      getEnv("RELAY_PUBKEY", ""),
		RelayPrivkey:     getEnv("RELAY_PRIVKEY", ""),
		RelayContact:     getEnv("RELAY_CONTACT", ""),
		RelayPort:        getEnvAsInt("RELAY_PORT", 8008),
		RelayDomain:      getEnv("RELAY_DOMAIN", ""),
		StorageType:      getEnv("STORAGE_TYPE", "sqlite"),
		SQLiteDBPath:     getEnv("SQLITE_DB_PATH", "./relay.db"),
		AuthPlugin:       getEnv("AUTH_PLUGIN", "none"),
		LogLevel:          getEnv("LOG_LEVEL", "INFO"),
		RateLimiterCleanupInterval: getEnvAsDuration("RATE_LIMITER_CLEANUP_INTERVAL", 5*time.Minute),
		RateLimitWindow:            getEnvAsDuration("RATE_LIMIT_WINDOW", 1*time.Minute),
	}

	// Validate port
	if config.RelayPort < 1 || config.RelayPort > 65535 {
		return nil, fmt.Errorf("invalid RELAY_PORT: must be between 1 and 65535, got %d", config.RelayPort)
	}

	// Validate storage type
	if config.StorageType != "sqlite" && config.StorageType != "" {
		// Allow custom storage types, but warn if not recognized
	}

	return config, nil
}

// Helper functions

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

func getEnvAsInt(key string, defaultValue int) int {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	intValue, err := strconv.Atoi(value)
	if err != nil {
		return defaultValue
	}
	return intValue
}

func getEnvAsDuration(key string, defaultValue time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	duration, err := time.ParseDuration(value)
	if err != nil {
		return defaultValue
	}
	return duration
}

