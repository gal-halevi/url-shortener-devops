#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get absolute paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROJECT_ROOT="$(cd "$SERVICE_DIR/../.." && pwd)"

# Track if we started containers
CONTAINERS_STARTED=0

# Cleanup function - always runs from correct location
cleanup() {
  if [ "$CONTAINERS_STARTED" = "1" ]; then
    echo -e "${YELLOW}🧹 Cleaning up test infrastructure...${NC}"
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.test.yaml down -v
  fi
}

# Trap EXIT signal to ensure cleanup runs even on failure
trap cleanup EXIT

echo -e "${YELLOW}🚀 Starting integration tests for analytics-service...${NC}"

# Check if docker-compose.test.yaml exists
if [ ! -f "$PROJECT_ROOT/docker-compose.test.yaml" ]; then
    echo -e "${RED}❌ docker-compose.test.yaml not found at $PROJECT_ROOT${NC}"
    exit 1
fi

# Start test infrastructure
echo -e "${YELLOW}📦 Starting test databases...${NC}"
cd "$PROJECT_ROOT"
docker-compose -f docker-compose.test.yaml up -d
CONTAINERS_STARTED=1

# Wait for databases to be ready
echo -e "${YELLOW}⏳ Waiting for databases to be healthy...${NC}"
sleep 5

# Check postgres health
echo -e "${YELLOW}🔍 Checking PostgreSQL health...${NC}"
until docker-compose -f docker-compose.test.yaml exec -T postgres-test pg_isready -U test_user -d urlshortener_test > /dev/null 2>&1; do
  echo "Waiting for PostgreSQL..."
  sleep 1
done
echo -e "${GREEN}✅ PostgreSQL is ready${NC}"

# Check redis health
echo -e "${YELLOW}🔍 Checking Redis health...${NC}"
until docker-compose -f docker-compose.test.yaml exec -T redis-test redis-cli ping > /dev/null 2>&1; do
  echo "Waiting for Redis..."
  sleep 1
done
echo -e "${GREEN}✅ Redis is ready${NC}"

# Run integration tests
echo -e "${YELLOW}🧪 Running integration tests...${NC}"
cd "$SERVICE_DIR"

# Load test environment variables (filter out comments and empty lines)
if [ -f .env.test ]; then
  export $(grep -v '^#' .env.test | grep -v '^$' | xargs)
else
  echo -e "${RED}❌ .env.test not found at $SERVICE_DIR${NC}"
  exit 1
fi

# Run tests
if python -m pytest tests/integration -v --tb=short; then
  echo -e "${GREEN}✅ All integration tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Integration tests failed${NC}"
  exit 1
fi