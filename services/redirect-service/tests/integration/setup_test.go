package integration

import (
	"fmt"
	"os"
	"testing"

	"redirect-service/internal/repository"
	"redirect-service/tests/integration/fixtures"

	_ "github.com/lib/pq"
)

var (
	testDB      *repository.DatabaseRepository
	testCache   *repository.CacheRepository
	testFixture *fixtures.TestDatabase  // Separate fixture for test data management
)

func TestMain(m *testing.M) {
	// Setup
	if err := setupTestDatabases(); err != nil {
		fmt.Printf("Failed to setup test databases: %v\n", err)
		os.Exit(1)
	}

	// Run tests
	code := m.Run()

	// Cleanup
	teardownTestDatabases()

	os.Exit(code)
}

func setupTestDatabases() error {
	// Get connection strings from environment (with test defaults)
	dbURL := os.Getenv("TEST_DATABASE_URL")
	if dbURL == "" {
		return fmt.Errorf("TEST_DATABASE_URL environment variable is required")
	}

	redisURL := os.Getenv("TEST_REDIS_URL")
	if redisURL == "" {
		return fmt.Errorf("TEST_REDIS_URL environment variable is required")
	}

	// Connect to PostgreSQL
	var err error
	
	// Production repository (used by service under test)
	testDB, err = repository.NewDatabaseRepository(dbURL)
	if err != nil {
		return fmt.Errorf("failed to connect to test database: %w", err)
	}

	// Connect to Redis
	testCache, err = repository.NewCacheRepository(redisURL)
	if err != nil {
		return fmt.Errorf("failed to connect to test cache: %w", err)
	}

	// Test fixture (used for test data setup/cleanup)
	testFixture, err = fixtures.NewTestDatabase(dbURL)
	if err != nil {
		return fmt.Errorf("failed to create test fixture: %w", err)
	}

	if err := testFixture.CleanupTestURLs(); err != nil {
		return fmt.Errorf("failed to cleanup test data: %w", err)
	}

	return nil
}

func teardownTestDatabases() {
	if testFixture != nil {
		testFixture.CleanupTestURLs()
		testFixture.Close()
	}
	if testDB != nil {
		testDB.Close()
	}
	if testCache != nil {
		testCache.Close()
	}
}

func cleanupTestData() error {
	// Clean database
	if testDB != nil {
		db := getDBConnection(testDB)
		if _, err := db.Exec("DELETE FROM urls WHERE short_code LIKE 'test%'"); err != nil {
			return err
		}
	}
	
	// Clean cache - delete all test-related keys
	if testCache != nil {
		testKeys := []string{
			"url:testint1",
			"url:testcache",
			"url:testclick",
			"url:testinact",
		}
		
		for _, key := range testKeys {
			testCache.Delete(key)
		}
	}
	
	return nil
}