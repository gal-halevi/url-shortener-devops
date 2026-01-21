package integration

import (
	"testing"
	"time"

	"redirect-service/internal/service"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetLongURL_Integration_Success(t *testing.T) {
	// Cleanup first to ensure fresh state
	testFixture.CleanupTestURLs()
	testCache.Delete("url:testint1")
	
	// Arrange
	err := testFixture.InsertURL("testint1", "https://integration-test.com", true)
	require.NoError(t, err)

	urlService := service.NewURLService(testDB, testCache)

	// Act
	longURL, err := urlService.GetLongURL("testint1")

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, "https://integration-test.com", longURL)

	// Cleanup
	testFixture.CleanupTestURLs()
	testCache.Delete("url:testint1")
}

func TestGetLongURL_Integration_Caching(t *testing.T) {
	// Cleanup first
	testFixture.CleanupTestURLs()
	testCache.Delete("url:testcache")
	
	// Arrange
	err := testFixture.InsertURL("testcache", "https://cache-test.com", true)
	require.NoError(t, err)

	urlService := service.NewURLService(testDB, testCache)

	// Act
	longURL1, err1 := urlService.GetLongURL("testcache")
	longURL2, err2 := urlService.GetLongURL("testcache")

	// Assert
	assert.NoError(t, err1)
	assert.NoError(t, err2)
	assert.Equal(t, "https://cache-test.com", longURL1)
	assert.Equal(t, "https://cache-test.com", longURL2)

	cachedValue, err := testCache.Get("url:testcache")
	assert.NoError(t, err)
	assert.Equal(t, "https://cache-test.com", cachedValue)

	// Cleanup
	testFixture.CleanupTestURLs()
	testCache.Delete("url:testcache")
}

func TestGetLongURL_Integration_NotFound(t *testing.T) {
	// Arrange
	urlService := service.NewURLService(testDB, testCache)

	// Act
	longURL, err := urlService.GetLongURL("testnotfnd")

	// Assert
	assert.Error(t, err)
	assert.Equal(t, "", longURL)
	assert.Contains(t, err.Error(), "URL not found")
}

func TestGetLongURL_Integration_ClickCount(t *testing.T) {
	// Cleanup first to ensure fresh state
	testFixture.CleanupTestURLs()
	testCache.Delete("url:testclick")
	
	// Arrange
	err := testFixture.InsertURL("testclick", "https://click-test.com", true)
	require.NoError(t, err)

	urlService := service.NewURLService(testDB, testCache)

	// Act - First request (should be cache miss, will increment)
	_, err = urlService.GetLongURL("testclick")
	require.NoError(t, err)
	time.Sleep(50 * time.Millisecond) // Wait for async increment

	// Assert - Click count should be 1
	clickCount, err := testFixture.GetClickCount("testclick")
	require.NoError(t, err)
	assert.Equal(t, int64(1), clickCount, "First request should increment click count")

	// Act - Second request (cache hit, won't increment)
	_, err = urlService.GetLongURL("testclick")
	require.NoError(t, err)
	time.Sleep(50 * time.Millisecond)

	// Assert - Click count should still be 1 (cached)
	clickCount, err = testFixture.GetClickCount("testclick")
	require.NoError(t, err)
	assert.Equal(t, int64(1), clickCount, "Cached requests should not increment click count")

	// Cleanup
	testFixture.CleanupTestURLs()
	testCache.Delete("url:testclick")
}

func TestGetLongURL_Integration_InactiveURL(t *testing.T) {
	// Cleanup first
	testFixture.CleanupTestURLs()
	testCache.Delete("url:testinact")
	
	// Arrange
	err := testFixture.InsertURL("testinact", "https://inactive.com", false)
	require.NoError(t, err)

	urlService := service.NewURLService(testDB, testCache)

	// Act
	longURL, err := urlService.GetLongURL("testinact")

	// Assert - Should not find inactive URLs
	assert.Error(t, err)
	assert.Equal(t, "", longURL)

	// Cleanup
	testFixture.CleanupTestURLs()
	testCache.Delete("url:testinact")
}