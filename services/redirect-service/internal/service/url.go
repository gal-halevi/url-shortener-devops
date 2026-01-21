package service

import (
	"fmt"
	"log"
	"redirect-service/internal/repository"
	"time"
)

type URLService struct {
	db    repository.DatabaseRepositoryInterface
	cache repository.CacheRepositoryInterface
}

func NewURLService(db repository.DatabaseRepositoryInterface, cache repository.CacheRepositoryInterface) *URLService {
	return &URLService{
		db:    db,
		cache: cache,
	}
}

func (s *URLService) GetLongURL(shortCode string) (string, error) {
	// Try cache first
	cacheKey := fmt.Sprintf("url:%s", shortCode)
	cachedURL, err := s.cache.Get(cacheKey)
	
	if err != nil {
		log.Printf("⚠️  Cache error: %v", err)
	}

	if cachedURL != "" {
		log.Printf("✅ Cache hit for: %s", shortCode)
		return cachedURL, nil
	}

	// Cache miss - check database
	log.Printf("⚠️  Cache miss for: %s, checking database", shortCode)
	
	url, err := s.db.GetURLByShortCode(shortCode)
	if err != nil {
		return "", fmt.Errorf("database error: %w", err)
	}

	if url == nil {
		return "", fmt.Errorf("URL not found")
	}

	// Store in cache for future requests (24 hour TTL)
	if err := s.cache.Set(cacheKey, url.LongURL, 24*time.Hour); err != nil {
		log.Printf("⚠️  Failed to cache URL: %v", err)
	}

	// Increment click count (async, don't wait)
	go func() {
		if err := s.db.IncrementClickCount(shortCode); err != nil {
			log.Printf("⚠️  Failed to increment click count: %v", err)
		}
	}()

	return url.LongURL, nil
}