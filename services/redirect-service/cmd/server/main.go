package main

import (
	"log"
	"net/http"
	"redirect-service/internal/handler"
	"redirect-service/internal/middleware"
	"redirect-service/internal/repository"
	"redirect-service/internal/service"
	"redirect-service/pkg/config"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize database
	db, err := repository.NewDatabaseRepository(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize cache
	cache, err := repository.NewCacheRepository(cfg.RedisURL)
	if err != nil {
		log.Fatalf("❌ Failed to connect to Redis: %v", err)
	}
	defer cache.Close()

	// Initialize service
	urlService := service.NewURLService(db, cache)

	// Initialize handler
	redirectHandler := handler.NewRedirectHandler(urlService)

	// Setup router
	r := chi.NewRouter()

	// Middleware
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(chimiddleware.Recoverer)

	// Routes
	r.Get("/health", redirectHandler.HandleHealth)
	r.Get("/{code}", redirectHandler.HandleRedirect)

	// Start server
	log.Printf("🚀 Redirect Service starting on port %s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatalf("❌ Server failed: %v", err)
	}
}