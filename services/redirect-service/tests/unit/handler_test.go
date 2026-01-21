package unit

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"redirect-service/internal/handler"
	"redirect-service/internal/service"

	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Mock URL Service
type MockURLService struct {
	mock.Mock
}

var _ service.URLServiceInterface = (*MockURLService)(nil)

func (m *MockURLService) GetLongURL(shortCode string) (string, error) {
	args := m.Called(shortCode)
	return args.String(0), args.Error(1)
}

// Test Health Endpoint
func TestHandleHealth(t *testing.T) {
	// Arrange
	mockService := new(MockURLService)
	h := handler.NewRedirectHandler(mockService)
	
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	// Act
	h.HandleHealth(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"status":"ok"`)
	assert.Contains(t, w.Body.String(), `"service":"redirect-service"`)
	assert.Contains(t, w.Body.String(), `"timestamp"`)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))
}

// Test Redirect - Success
func TestHandleRedirect_Success(t *testing.T) {
	// Arrange
	mockService := new(MockURLService)
	mockService.On("GetLongURL", "test123").Return("https://example.com", nil)
	
	h := handler.NewRedirectHandler(mockService)
	
	req := httptest.NewRequest(http.MethodGet, "/test123", nil)
	w := httptest.NewRecorder()
	
	// Setup chi context for URL params
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("code", "test123")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	// Act
	h.HandleRedirect(w, req)

	// Assert
	assert.Equal(t, http.StatusFound, w.Code)
	assert.Equal(t, "https://example.com", w.Header().Get("Location"))
	mockService.AssertExpectations(t)
}

// Test Redirect - URL Not Found
func TestHandleRedirect_NotFound(t *testing.T) {
	// Arrange
	mockService := new(MockURLService)
	mockService.On("GetLongURL", "notfound").Return("", errors.New("URL not found"))
	
	h := handler.NewRedirectHandler(mockService)
	
	req := httptest.NewRequest(http.MethodGet, "/notfound", nil)
	w := httptest.NewRecorder()
	
	// Setup chi context
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("code", "notfound")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	// Act
	h.HandleRedirect(w, req)

	// Assert
	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Contains(t, w.Body.String(), "URL not found")
	mockService.AssertExpectations(t)
}

// Test Redirect - Missing Short Code
func TestHandleRedirect_MissingCode(t *testing.T) {
	// Arrange
	mockService := new(MockURLService)
	h := handler.NewRedirectHandler(mockService)
	
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	
	// Setup chi context with empty code
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("code", "")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	// Act
	h.HandleRedirect(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Short code is required")
	mockService.AssertNotCalled(t, "GetLongURL")
}

// Test Redirect - Service Error (Database Error)
func TestHandleRedirect_ServiceError(t *testing.T) {
	// Arrange
	mockService := new(MockURLService)
	mockService.On("GetLongURL", "error123").Return("", errors.New("database error: connection failed"))
	
	h := handler.NewRedirectHandler(mockService)
	
	req := httptest.NewRequest(http.MethodGet, "/error123", nil)
	w := httptest.NewRecorder()
	
	// Setup chi context
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("code", "error123")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	// Act
	h.HandleRedirect(w, req)

	// Assert
	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Contains(t, w.Body.String(), "URL not found")
	mockService.AssertExpectations(t)
}