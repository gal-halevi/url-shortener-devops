package repository

import "time"

type DatabaseRepositoryInterface interface {
	GetURLByShortCode(shortCode string) (*URL, error)
	IncrementClickCount(shortCode string) error
	Close() error
}

type CacheRepositoryInterface interface {
	Get(key string) (string, error)
	Set(key, value string, expiration time.Duration) error
	Delete(key string) error
	Close() error
}