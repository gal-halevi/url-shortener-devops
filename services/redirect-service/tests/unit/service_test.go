package unit

import (
	"errors"
	"testing"
	"time"

	"redirect-service/internal/repository"
	"redirect-service/internal/service"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Mock Database Repository
type MockDatabaseRepository struct {
	mock.Mock
}

var _ repository.DatabaseRepositoryInterface = (*MockDatabaseRepository)(nil)

func (m *MockDatabaseRepository) GetURLByShortCode(shortCode string) (*repository.URL, error) {
	args := m.Called(shortCode)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.URL), args.Error(1)
}

func (m *MockDatabaseRepository) IncrementClickCount(shortCode string) error {
	args := m.Called(shortCode)
	return args.Error(0)
}

func (m *MockDatabaseRepository) Close() error {
	args := m.Called()
	return args.Error(0)
}

// Mock Cache Repository
type MockCacheRepository struct {
	mock.Mock
}

var _ repository.CacheRepositoryInterface = (*MockCacheRepository)(nil)

func (m *MockCacheRepository) Get(key string) (string, error) {
	args := m.Called(key)
	return args.String(0), args.Error(1)
}

func (m *MockCacheRepository) Set(key, value string, expiration time.Duration) error {
	args := m.Called(key, value, expiration)
	return args.Error(0)
}

func (m *MockCacheRepository) Close() error {
	args := m.Called()
	return args.Error(0)
}

// Tests
func TestGetLongURL_CacheHit(t *testing.T) {
	// Arrange
	mockDB := new(MockDatabaseRepository)
	mockCache := new(MockCacheRepository)
	
	mockCache.On("Get", "url:test123").Return("https://example.com", nil)
	
	urlService := service.NewURLService(mockDB, mockCache)

	// Act
	longURL, err := urlService.GetLongURL("test123")

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, "https://example.com", longURL)
	mockCache.AssertExpectations(t)
	mockDB.AssertNotCalled(t, "GetURLByShortCode")
}

func TestGetLongURL_CacheMiss_DatabaseHit(t *testing.T) {
	// Arrange
	mockDB := new(MockDatabaseRepository)
	mockCache := new(MockCacheRepository)
	
	mockCache.On("Get", "url:test123").Return("", nil) // Cache miss
	mockDB.On("GetURLByShortCode", "test123").Return(&repository.URL{
		ID:        "1",
		ShortCode: "test123",
		LongURL:   "https://example.com",
		IsActive:  true,
	}, nil)
	mockCache.On("Set", "url:test123", "https://example.com", 24*time.Hour).Return(nil)
	// Don't assert on IncrementClickCount since it's async
	mockDB.On("IncrementClickCount", "test123").Return(nil).Maybe()
	
	urlService := service.NewURLService(mockDB, mockCache)

	// Act
	longURL, err := urlService.GetLongURL("test123")

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, "https://example.com", longURL)
	mockCache.AssertExpectations(t)
	// Only assert on synchronous DB calls
	mockDB.AssertCalled(t, "GetURLByShortCode", "test123")
	
	// Give a small delay for async operation to complete (optional)
	time.Sleep(10 * time.Millisecond)
}

func TestGetLongURL_URLNotFound(t *testing.T) {
	// Arrange
	mockDB := new(MockDatabaseRepository)
	mockCache := new(MockCacheRepository)
	
	mockCache.On("Get", "url:notfound").Return("", nil)
	mockDB.On("GetURLByShortCode", "notfound").Return(nil, nil) // Not found
	
	urlService := service.NewURLService(mockDB, mockCache)

	// Act
	longURL, err := urlService.GetLongURL("notfound")

	// Assert
	assert.Error(t, err)
	assert.Equal(t, "", longURL)
	assert.Contains(t, err.Error(), "URL not found")
	mockCache.AssertExpectations(t)
	mockDB.AssertExpectations(t)
}

func TestGetLongURL_DatabaseError(t *testing.T) {
	// Arrange
	mockDB := new(MockDatabaseRepository)
	mockCache := new(MockCacheRepository)
	
	mockCache.On("Get", "url:test123").Return("", nil)
	mockDB.On("GetURLByShortCode", "test123").Return(nil, errors.New("database connection failed"))
	
	urlService := service.NewURLService(mockDB, mockCache)

	// Act
	longURL, err := urlService.GetLongURL("test123")

	// Assert
	assert.Error(t, err)
	assert.Equal(t, "", longURL)
	assert.Contains(t, err.Error(), "database error")
	mockCache.AssertExpectations(t)
	mockDB.AssertExpectations(t)
}