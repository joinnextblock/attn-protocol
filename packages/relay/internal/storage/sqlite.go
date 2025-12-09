// Package storage provides SQLite-based event storage for the public relay.
// This is a simple implementation suitable for small to medium-scale deployments.
package storage

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/nbd-wtf/go-nostr"
	_ "modernc.org/sqlite"
)

// SQLiteStorage provides SQLite-based storage for Nostr events.
type SQLiteStorage struct {
	db     *sql.DB
	dbPath string
}

// NewSQLiteStorage creates a new SQLite storage instance.
//
// Parameters:
//   - dbPath: Path to the SQLite database file
//
// Returns a new SQLiteStorage instance ready for use.
func NewSQLiteStorage(dbPath string) (*SQLiteStorage, error) {
	// Use connection string with query parameters to set PRAGMAs on all connections
	// modernc.org/sqlite supports query parameters in the DSN
	// Format: file:path?param=value&param2=value2
	// busy_timeout is in milliseconds - 10000 = 10 seconds
	dsn := fmt.Sprintf("%s?_journal_mode=WAL&_synchronous=NORMAL&_busy_timeout=10000&_foreign_keys=ON&_cache_size=-64000", dbPath)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open SQLite database: %w", err)
	}

	// Also set PRAGMAs via Exec to ensure they're applied to the initial connection
	// This is a fallback in case the DSN parameters aren't fully supported
	pragmas := []string{
		"PRAGMA journal_mode = WAL",
		"PRAGMA synchronous = NORMAL",
		"PRAGMA busy_timeout = 10000", // 10 second timeout for locks
		"PRAGMA foreign_keys = ON",
		"PRAGMA cache_size = -64000", // 64MB cache (negative = KB)
	}

	for _, pragma := range pragmas {
		if _, err := db.Exec(pragma); err != nil {
			// Log but don't fail - DSN parameters might have set them
			// This is just a fallback
		}
	}

	// Configure connection pool for SQLite
	// SQLite with WAL mode can handle a few concurrent writers, but too many connections
	// can cause contention. We limit to a small number optimized for SQLite.
	// SetMaxOpenConns sets the maximum number of open connections to the database
	// For SQLite, 3-5 connections is optimal even with WAL mode
	db.SetMaxOpenConns(5)
	// SetMaxIdleConns sets the maximum number of connections in the idle connection pool
	db.SetMaxIdleConns(2)
	// SetConnMaxLifetime sets the maximum amount of time a connection may be reused
	// Shorter lifetime helps ensure PRAGMAs are refreshed
	db.SetConnMaxLifetime(1 * time.Minute)
	// SetConnMaxIdleTime sets the maximum amount of time a connection may be idle
	db.SetConnMaxIdleTime(30 * time.Second)

	storage := &SQLiteStorage{
		db:     db,
		dbPath: dbPath,
	}

	// Initialize schema
	if err := storage.initSchema(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to initialize schema: %w", err)
	}

	return storage, nil
}

// initSchema creates the necessary database tables and indexes.
func (s *SQLiteStorage) initSchema() error {
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS events (
		id TEXT PRIMARY KEY,
		pubkey TEXT NOT NULL,
		created_at INTEGER NOT NULL,
		kind INTEGER NOT NULL,
		content TEXT NOT NULL,
		tags TEXT NOT NULL,
		sig TEXT NOT NULL
	);

	CREATE INDEX IF NOT EXISTS idx_pubkey ON events(pubkey);
	CREATE INDEX IF NOT EXISTS idx_kind ON events(kind);
	CREATE INDEX IF NOT EXISTS idx_created_at ON events(created_at);
	CREATE INDEX IF NOT EXISTS idx_pubkey_kind ON events(pubkey, kind);
	CREATE INDEX IF NOT EXISTS idx_kind_created_at ON events(kind, created_at);
	`

	_, err := s.db.Exec(createTableSQL)
	return err
}

// StoreEvent stores a Nostr event in SQLite.
// Implements retry logic for SQLITE_BUSY errors to handle concurrent writes.
func (s *SQLiteStorage) StoreEvent(ctx context.Context, event *nostr.Event) error {
	// Serialize tags to JSON
	tagsJSON, err := json.Marshal(event.Tags)
	if err != nil {
		return fmt.Errorf("failed to marshal tags: %w", err)
	}

	// Use INSERT OR REPLACE to handle replaceable events
	query := `
		INSERT OR REPLACE INTO events (id, pubkey, created_at, kind, content, tags, sig)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`

	// Retry logic for SQLITE_BUSY errors
	// SQLite with WAL mode can still have brief lock contention with concurrent writes
	maxRetries := 10
	baseDelay := 5 * time.Millisecond
	maxDelay := 100 * time.Millisecond

	for attempt := 0; attempt < maxRetries; attempt++ {
		_, err = s.db.ExecContext(ctx, query,
			event.ID,
			event.PubKey,
			int64(event.CreatedAt),
			event.Kind,
			event.Content,
			string(tagsJSON),
			event.Sig,
		)

		if err == nil {
			return nil
		}

		// Check if error is SQLITE_BUSY
		errStr := err.Error()
		if strings.Contains(errStr, "database is locked") || strings.Contains(errStr, "SQLITE_BUSY") {
			if attempt < maxRetries-1 {
				// Exponential backoff with jitter, capped at maxDelay
				delay := baseDelay * time.Duration(1<<uint(attempt))
				if delay > maxDelay {
					delay = maxDelay
				}
				// Add small random jitter to prevent thundering herd
				select {
				case <-ctx.Done():
					return ctx.Err()
				case <-time.After(delay):
				}
				continue
			}
		}

		// If not a busy error or max retries reached, return error
		return fmt.Errorf("failed to store event: %w", err)
	}

	return fmt.Errorf("failed to store event after %d retries: %w", maxRetries, err)
}

// QueryEvents queries events matching the provided filter.
func (s *SQLiteStorage) QueryEvents(ctx context.Context, filter *nostr.Filter) ([]*nostr.Event, error) {
	// Build query based on filter
	query := "SELECT id, pubkey, created_at, kind, content, tags, sig FROM events WHERE 1=1"
	args := []interface{}{}

	// Add filters
	if len(filter.IDs) > 0 {
		placeholders := ""
		for i, id := range filter.IDs {
			if i > 0 {
				placeholders += ","
			}
			placeholders += "?"
			args = append(args, id)
		}
		query += fmt.Sprintf(" AND id IN (%s)", placeholders)
	}

	if len(filter.Authors) > 0 {
		placeholders := ""
		for i, author := range filter.Authors {
			if i > 0 {
				placeholders += ","
			}
			placeholders += "?"
			args = append(args, author)
		}
		query += fmt.Sprintf(" AND pubkey IN (%s)", placeholders)
	}

	if len(filter.Kinds) > 0 {
		placeholders := ""
		for i, kind := range filter.Kinds {
			if i > 0 {
				placeholders += ","
			}
			placeholders += "?"
			args = append(args, kind)
		}
		query += fmt.Sprintf(" AND kind IN (%s)", placeholders)
	}

	if filter.Since != nil {
		query += " AND created_at >= ?"
		args = append(args, int64(*filter.Since))
	}

	if filter.Until != nil {
		query += " AND created_at <= ?"
		args = append(args, int64(*filter.Until))
	}

	// Order by created_at descending
	query += " ORDER BY created_at DESC"

	// Apply limit
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", filter.Limit)
	} else {
		// Default limit
		query += " LIMIT 500"
	}

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query events: %w", err)
	}
	defer rows.Close()

	var events []*nostr.Event
	for rows.Next() {
		var id, pubkey, content, tagsJSON, sig string
		var createdAt int64
		var kind int

		if err := rows.Scan(&id, &pubkey, &createdAt, &kind, &content, &tagsJSON, &sig); err != nil {
			return nil, fmt.Errorf("failed to scan event: %w", err)
		}

		// Deserialize tags
		var tags nostr.Tags
		if err := json.Unmarshal([]byte(tagsJSON), &tags); err != nil {
			return nil, fmt.Errorf("failed to unmarshal tags: %w", err)
		}

		event := &nostr.Event{
			ID:        id,
			PubKey:    pubkey,
			CreatedAt: nostr.Timestamp(createdAt),
			Kind:      kind,
			Content:   content,
			Tags:      tags,
			Sig:       sig,
		}

		events = append(events, event)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return events, nil
}

// DeleteEvent deletes an event by its ID.
func (s *SQLiteStorage) DeleteEvent(ctx context.Context, eventID string) error {
	query := "DELETE FROM events WHERE id = ?"
	result, err := s.db.ExecContext(ctx, query, eventID)
	if err != nil {
		return fmt.Errorf("failed to delete event: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("event not found: %s", eventID)
	}

	return nil
}

// Close closes the database connection.
func (s *SQLiteStorage) Close() error {
	return s.db.Close()
}
