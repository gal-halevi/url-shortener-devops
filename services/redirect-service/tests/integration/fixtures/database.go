package fixtures

import (
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
)

// TestDatabase wraps database operations specifically for testing
type TestDatabase struct {
	conn *sql.DB
}

// NewTestDatabase creates a new test database connection
func NewTestDatabase(dbURL string) (*TestDatabase, error) {
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping: %w", err)
	}

	return &TestDatabase{conn: db}, nil
}

// InsertURL inserts a test URL directly
func (td *TestDatabase) InsertURL(shortCode, longURL string, isActive bool) error {
	// Only specify the required columns, let defaults handle the rest
	query := `
		INSERT INTO urls (short_code, long_url, is_active)
		VALUES ($1, $2, $3)
		ON CONFLICT (short_code) DO NOTHING
	`
	_, err := td.conn.Exec(query, shortCode, longURL, isActive)
	return err
}

// CleanupTestURLs removes all test URLs (those starting with 'test')
func (td *TestDatabase) CleanupTestURLs() error {
	_, err := td.conn.Exec("DELETE FROM urls WHERE short_code LIKE 'test%'")
	return err
}

// GetClickCount returns the click count for a given short code
func (td *TestDatabase) GetClickCount(shortCode string) (int64, error) {
	var count int64
	query := "SELECT click_count FROM urls WHERE short_code = $1"
	err := td.conn.QueryRow(query, shortCode).Scan(&count)
	return count, err
}

// Close closes the test database connection
func (td *TestDatabase) Close() error {
	return td.conn.Close()
}