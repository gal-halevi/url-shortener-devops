package repository

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

type DatabaseRepository struct {
	db *sql.DB
}

type URL struct {
	ID        string
	ShortCode string
	LongURL   string
	IsActive  bool
	ClickCount int64
}

func NewDatabaseRepository(databaseURL string) (*DatabaseRepository, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("✅ Connected to PostgreSQL database")

	return &DatabaseRepository{db: db}, nil
}

func (r *DatabaseRepository) GetURLByShortCode(shortCode string) (*URL, error) {
	query := `
		SELECT id, short_code, long_url, is_active 
		FROM urls 
		WHERE short_code = $1 AND is_active = true
	`

	var url URL
	err := r.db.QueryRow(query, shortCode).Scan(
		&url.ID,
		&url.ShortCode,
		&url.LongURL,
		&url.IsActive,
	)

	if err == sql.ErrNoRows {
		return nil, nil // Not found
	}

	if err != nil {
		return nil, fmt.Errorf("database query error: %w", err)
	}

	return &url, nil
}

func (r *DatabaseRepository) IncrementClickCount(shortCode string) error {
	query := `
		UPDATE urls 
		SET click_count = click_count + 1 
		WHERE short_code = $1
	`

	_, err := r.db.Exec(query, shortCode)
	return err
}

func (r *DatabaseRepository) Close() error {
	return r.db.Close()
}