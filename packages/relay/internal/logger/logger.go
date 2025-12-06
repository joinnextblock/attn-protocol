package logger

import (
	"os"
	"strings"

	"github.com/rs/zerolog"
)

var global_logger zerolog.Logger

// Init initializes the global logger with the specified log level.
// Configures a console writer with human-readable format, timestamps, and color output.
// The logger is configured to write to stderr with the format "2006/01/02 15:04:05".
//
// Parameters:
//   - log_level: String log level (DEBUG, INFO, WARN, ERROR). Case-insensitive.
//     Unknown values default to INFO level.
//
// This function should be called once at application startup before using any
// logging functions. The global logger is then accessible via GetLogger() or
// the convenience functions (Debug, Info, Warn, Error, Fatal).
func Init(log_level string) {
	// Set global log level
	level := parseLogLevel(log_level)
	zerolog.SetGlobalLevel(level)

	// Configure console writer with human-readable format
	output := zerolog.ConsoleWriter{
		Out:        os.Stderr,
		TimeFormat: "2006/01/02 15:04:05",
		NoColor:    false,
	}

	// Create logger with console writer
	global_logger = zerolog.New(output).With().
		Timestamp().
		Logger()
}

// parseLogLevel converts string log level to zerolog level
func parseLogLevel(level string) zerolog.Level {
	level = strings.ToUpper(strings.TrimSpace(level))
	switch level {
	case "DEBUG":
		return zerolog.DebugLevel
	case "INFO":
		return zerolog.InfoLevel
	case "WARN":
		return zerolog.WarnLevel
	case "ERROR":
		return zerolog.ErrorLevel
	default:
		// Default to INFO if unknown
		return zerolog.InfoLevel
	}
}

// GetLogger returns the global logger instance.
// Returns the zerolog.Logger that was initialized by Init().
//
// Returns the global logger instance. If Init() has not been called,
// returns a zero-value logger (which will still function but may not
// have the expected configuration).
func GetLogger() zerolog.Logger {
	return global_logger
}

// Debug returns a debug-level log event.
// Use this for detailed diagnostic information that is typically only
// useful during development or troubleshooting.
//
// Returns a zerolog.Event that can be chained with field methods and
// finalized with Msg() or Msgf().
//
// Example:
//   logger.Debug().Str("user", "alice").Msg("User logged in")
func Debug() *zerolog.Event {
	return global_logger.Debug()
}

// Info returns an info-level log event.
// Use this for general informational messages about application flow.
//
// Returns a zerolog.Event that can be chained with field methods and
// finalized with Msg() or Msgf().
//
// Example:
//   logger.Info().Str("service", "relay").Msg("Service started")
func Info() *zerolog.Event {
	return global_logger.Info()
}

// Warn returns a warning-level log event.
// Use this for warning messages about potentially harmful situations
// that don't prevent the application from functioning.
//
// Returns a zerolog.Event that can be chained with field methods and
// finalized with Msg() or Msgf().
//
// Example:
//   logger.Warn().Str("event_id", "abc123").Msg("Event validation failed")
func Warn() *zerolog.Event {
	return global_logger.Warn()
}

// Error returns an error-level log event.
// Use this for error events that might still allow the application
// to continue running.
//
// Returns a zerolog.Event that can be chained with field methods and
// finalized with Msg() or Msgf().
//
// Example:
//   logger.Error().Err(err).Str("operation", "store").Msg("Failed to store event")
func Error() *zerolog.Event {
	return global_logger.Error()
}

// Fatal returns a fatal-level log event.
// When finalized with Msg() or Msgf(), this will log the message and
// then call os.Exit(1), terminating the application.
//
// Returns a zerolog.Event that can be chained with field methods and
// finalized with Msg() or Msgf().
//
// Example:
//   logger.Fatal().Err(err).Msg("Critical initialization failed")
//
// Warning: This will terminate the application. Use only for unrecoverable errors.
func Fatal() *zerolog.Event {
	return global_logger.Fatal()
}

// With creates a child logger with the given context.
// Returns a zerolog.Context that can be used to add persistent fields
// to all log events created from the resulting logger.
//
// Returns a zerolog.Context that can be chained with field methods
// and finalized with Logger() to create a child logger.
//
// Example:
//   childLogger := logger.With().Str("component", "storage").Logger()
//   childLogger.Info().Msg("Operation completed") // Will include component="storage"
func With() zerolog.Context {
	return global_logger.With()
}

// SetGlobalLevel sets the global log level for all loggers.
// This affects the minimum log level that will be output. Events below
// this level will be discarded.
//
// Parameters:
//   - level: The minimum zerolog.Level to output (DebugLevel, InfoLevel,
//     WarnLevel, ErrorLevel, FatalLevel, etc.)
//
// This is useful for runtime log level changes or testing scenarios
// where you want to adjust verbosity without restarting the application.
func SetGlobalLevel(level zerolog.Level) {
	zerolog.SetGlobalLevel(level)
}

