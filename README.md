# URL Shortener

A production-ready URL shortener built with microservices architecture, demonstrating DevOps best practices.

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Frontend  │────▶│   URL Service   │────▶│    PostgreSQL    │
│  (Next.js)  │     │      (Go)       │     │                  │
└─────────────┘     └─────────────────┘     └──────────────────┘
                            │
                            ▼
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Redirect  │────▶│     Redis       │◀────│  Worker Service  │
│   Service   │     │    (Cache)      │     │    (Python)      │
└─────────────┘     └─────────────────┘     └──────────────────┘
                            │
                            ▼
                    ┌─────────────────┐
                    │    Analytics    │
                    │    Service      │
                    └─────────────────┘
```

## Tech Stack

- **Frontend**: Next.js (TypeScript)
- **URL Service**: Go - handles URL creation and management
- **Redirect Service**: Go - handles fast URL redirects
- **Analytics Service**: Python (FastAPI) - processes analytics data
- **Worker Service**: Python - background job processing
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions
- **Infrastructure**: Terraform (AWS)

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Git

### Local Development

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd url-shortener-devops
   ```

2. Start the infrastructure:
   ```bash
   docker-compose up -d
   ```

3. Verify services are healthy:
   ```bash
   docker-compose ps
   ```

4. Connect to PostgreSQL:
   ```bash
   docker exec -it urlshortener-postgres psql -U postgres -d urlshortener
   ```

5. Test Redis connection:
   ```bash
   docker exec -it urlshortener-redis redis-cli -a localdev123 ping
   ```

## Project Structure

```
url-shortener-devops/
├── services/
│   ├── url-service/          # Go - URL CRUD operations
│   ├── redirect-service/     # Go - Fast redirects
│   ├── analytics-service/    # Python - Analytics API
│   ├── worker-service/       # Python - Background jobs
│   └── frontend/             # Next.js frontend
├── scripts/
│   └── init-db.sql           # Database initialization
├── docs/                     # Documentation
├── .github/                  # GitHub Actions workflows
├── docker-compose.yml        # Local development setup
└── README.md
```

## Database Schema

- **users**: User accounts with API key authentication
- **urls**: Shortened URLs with optional expiration
- **analytics_events**: Click tracking and analytics data
