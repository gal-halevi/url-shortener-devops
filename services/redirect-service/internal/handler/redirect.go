package handler

import (
	"fmt"
	"log"
	"net/http"
	"redirect-service/internal/service"
	"time"
	"github.com/go-chi/chi/v5"
)

type RedirectHandler struct {
	urlService service.URLServiceInterface
}

func NewRedirectHandler(urlService service.URLServiceInterface) *RedirectHandler {
	return &RedirectHandler{
		urlService: urlService,
	}
}

func (h *RedirectHandler) HandleRedirect(w http.ResponseWriter, r *http.Request) {
	shortCode := chi.URLParam(r, "code")

	if shortCode == "" {
		http.Error(w, "Short code is required", http.StatusBadRequest)
		return
	}

	// Get long URL
	longURL, err := h.urlService.GetLongURL(shortCode)
	if err != nil {
		log.Printf("❌ Error getting URL for code %s: %v", shortCode, err)
		http.Error(w, "URL not found", http.StatusNotFound)
		return
	}

	// Log redirect
	log.Printf("🔀 Redirecting %s -> %s", shortCode, longURL)

	// Redirect to long URL (302 Found)
	http.Redirect(w, r, longURL, http.StatusFound)
}

func (h *RedirectHandler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(fmt.Sprintf(`{"status":"ok","service":"redirect-service","timestamp":"%s"}`, time.Now().Format(time.RFC3339))))
}