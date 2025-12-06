// Package storage provides SQLite-based event storage for the public relay.
// This is a simple implementation suitable for small to medium-scale deployments.
package storage

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

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
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open SQLite database: %w", err)
	}

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

	_, err = s.db.ExecContext(ctx, query,
		event.ID,
		event.PubKey,
		int64(event.CreatedAt),
		event.Kind,
		event.Content,
		string(tagsJSON),
		event.Sig,
	)

	if err != nil {
		return fmt.Errorf("failed to store event: %w", err)
	}

	return nil
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

