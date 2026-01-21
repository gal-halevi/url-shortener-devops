package integration

import (
	"database/sql"
	"reflect"

	"redirect-service/internal/repository"
)

// getDBConnection extracts the underlying *sql.DB from DatabaseRepository
// This is only for testing and uses reflection to access the private field
func getDBConnection(repo *repository.DatabaseRepository) *sql.DB {
	// Use reflection to access the private 'db' field
	v := reflect.ValueOf(repo).Elem()
	dbField := v.FieldByName("db")

	return dbField.Interface().(*sql.DB)
}