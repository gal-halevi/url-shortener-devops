# URL Shortener Platform - DevOps Portfolio Project

## Project Overview

**Purpose**: A production-grade URL shortener platform designed to demonstrate comprehensive DevOps capabilities, modern cloud-native architecture, and security best practices.

**Target Audience**: Technical hiring managers and DevOps interviewers

**Technology Philosophy**: Industry-standard tools with focus on automation, observability, and security.

---

## Business Requirements

### Core Features
1. **URL Shortening**: Convert long URLs to short codes (e.g., `https://short.link/abc123`)
2. **Redirection**: Fast redirect from short URL to original URL
3. **Analytics**: Track clicks, geographic data, referrer information
4. **Admin Dashboard**: View statistics, manage URLs
5. **API Access**: RESTful API for programmatic access

### Non-Functional Requirements
- **Performance**: Redirect service < 50ms response time
- **Availability**: 99.9% uptime
- **Scalability**: Handle 10,000+ requests/second
- **Security**: OAuth2 authentication, rate limiting, input validation
- **Observability**: Full metrics, logging, and tracing

---

## System Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Internet / Users                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        AWS Route53 (DNS)                             │
│                    short.yourdomain.com                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Application Load Balancer                        │
│                        (AWS ALB / Ingress)                           │
│                         TLS Termination                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
        ┌──────────────────┐          ┌──────────────────┐
        │   Istio Ingress  │          │  NGINX Ingress   │
        │   Gateway        │          │  Controller      │
        │  (Service Mesh)  │          │  (Alternative)   │
        └──────────────────┘          └──────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster (EKS)                          │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Application Namespace                     │   │
│  │                                                               │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐            │   │
│  │  │  Frontend  │  │API Gateway │  │   Admin    │            │   │
│  │  │  (React)   │  │ (Auth/Rate │  │ Dashboard  │            │   │
│  │  │  Service   │  │  Limiting) │  │  (React)   │            │   │
│  │  └────────────┘  └────────────┘  └────────────┘            │   │
│  │         │               │                │                   │   │
│  │         └───────────────┼────────────────┘                   │   │
│  │                         ▼                                     │   │
│  │  ┌──────────────────────────────────────────────────┐       │   │
│  │  │           Microservices Layer                     │       │   │
│  │  │                                                    │       │   │
│  │  │  ┌──────────────┐  ┌──────────────┐             │       │   │
│  │  │  │ URL Service  │  │   Redirect   │             │       │   │
│  │  │  │              │  │   Service    │             │       │   │
│  │  │  │ - Create URL │  │ - Fast       │             │       │   │
│  │  │  │ - Validate   │  │   Lookup     │             │       │   │
│  │  │  │ - Manage     │  │ - Track      │             │       │   │
│  │  │  └──────────────┘  └──────────────┘             │       │   │
│  │  │                                                    │       │   │
│  │  │  ┌──────────────┐  ┌──────────────┐             │       │   │
│  │  │  │  Analytics   │  │   Worker     │             │       │   │
│  │  │  │   Service    │  │   Service    │             │       │   │
│  │  │  │              │  │              │             │       │   │
│  │  │  │ - Stats      │  │ - Async Jobs │             │       │   │
│  │  │  │ - Reports    │  │ - Email      │             │       │   │
│  │  │  │ - Aggregates │  │ - Cleanup    │             │       │   │
│  │  │  └──────────────┘  └──────────────┘             │       │   │
│  │  └──────────────────────────────────────────────────┘       │   │
│  │                         │                                     │   │
│  └─────────────────────────┼─────────────────────────────────────┘ │
│                            │                                         │
│  ┌─────────────────────────┼─────────────────────────────────────┐ │
│  │                    Data Layer                                  │ │
│  │                         │                                       │ │
│  │  ┌──────────────┐  ┌───┴──────┐  ┌──────────────┐            │ │
│  │  │  PostgreSQL  │  │  Redis   │  │  RabbitMQ    │            │ │
│  │  │              │  │          │  │              │            │ │
│  │  │ - URLs       │  │ - Cache  │  │ - Job Queue  │            │ │
│  │  │ - Users      │  │ - Session│  │ - Events     │            │ │
│  │  │ - Analytics  │  │ - Rate   │  │              │            │ │
│  │  │              │  │   Limit  │  │              │            │ │
│  │  │ StatefulSet  │  │Deployment│  │ StatefulSet  │            │ │
│  │  └──────────────┘  └──────────┘  └──────────────┘            │ │
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Monitoring & Observability Namespace            │   │
│  │                                                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │
│  │  │ Prometheus  │  │  Grafana    │  │AlertManager │         │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘         │   │
│  │                                                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │
│  │  │    Loki     │  │   Promtail  │  │   Jaeger    │         │   │
│  │  │  (Logs)     │  │ (Log Agent) │  │  (Tracing)  │         │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        External Services                             │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │AWS Secrets   │  │  CloudWatch  │  │   AWS S3     │              │
│  │  Manager     │  │   Logs       │  │  (Backups)   │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Service Details

### 1. Frontend Service
**Technology**: React, Nginx  
**Purpose**: User-facing web interface  
**Deployment**: Kubernetes Deployment (3 replicas)  

**Key Features**:
- URL submission form
- URL management dashboard
- Basic analytics visualization
- Responsive design

**Container**:
- Multi-stage Docker build
- Production build served by Nginx
- Environment-based configuration

---

### 2. API Gateway
**Technology**: Python (FastAPI) or Kong  
**Purpose**: Centralized entry point for all backend services  
**Deployment**: Kubernetes Deployment (3 replicas)  

**Responsibilities**:
- Authentication/Authorization (OAuth2)
- Rate limiting (per user/IP)
- Request routing
- API versioning
- CORS handling
- Request/response logging

**Why It Exists** (Interview Point):
> "Centralizes cross-cutting concerns like auth and rate limiting. Services behind it can focus purely on business logic. Simplifies security model—only the gateway is exposed."

---

### 3. URL Service
**Technology**: Python (Flask/FastAPI)  
**Purpose**: Core URL shortening business logic  
**Deployment**: Kubernetes Deployment (5 replicas, auto-scaling)  

**API Endpoints**:
```
POST   /api/v1/urls              - Create short URL
GET    /api/v1/urls/{id}         - Get URL details
PUT    /api/v1/urls/{id}         - Update URL
DELETE /api/v1/urls/{id}         - Delete URL
GET    /api/v1/urls              - List user's URLs
```

**Responsibilities**:
- Generate unique short codes (base62 encoding)
- Validate input URLs
- Store URL mappings in PostgreSQL
- Enforce user quotas
- Handle custom aliases (premium feature)

**Database Schema**:
```sql
CREATE TABLE urls (
    id BIGSERIAL PRIMARY KEY,
    short_code VARCHAR(10) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    custom_alias BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_short_code ON urls(short_code);
CREATE INDEX idx_user_id ON urls(user_id);
```

---

### 4. Redirect Service
**Technology**: Python (FastAPI) - optimized for speed  
**Purpose**: High-performance URL redirection  
**Deployment**: Kubernetes Deployment (10 replicas, HPA)  

**API Endpoints**:
```
GET /{short_code}  - Redirect to original URL
```

**Responsibilities**:
- Ultra-fast lookup (Redis cache)
- Track click event (async to queue)
- Handle 404s gracefully
- Support custom domains

**Performance Optimization**:
- Redis cache-aside pattern
- 99% cache hit rate target
- Async event publishing (no blocking)
- Connection pooling

**Why Separate from URL Service** (Interview Point):
> "Different scaling requirements. Redirects get 1000x more traffic than URL creation. Redirect service is read-heavy and benefits from aggressive caching. URL service is write-heavy and needs strong consistency."

**Data Flow**:
```
1. Request: GET /abc123
2. Check Redis: HGET urls:abc123 → {original_url, user_id}
3. If cache miss → Query PostgreSQL → Update Redis (TTL: 1 hour)
4. Publish click event to RabbitMQ (non-blocking)
5. Return 302 redirect
```

---

### 5. Analytics Service
**Technology**: Python (FastAPI)  
**Purpose**: Aggregate and serve analytics data  
**Deployment**: Kubernetes Deployment (3 replicas)  

**API Endpoints**:
```
GET /api/v1/analytics/urls/{id}/stats        - URL-specific stats
GET /api/v1/analytics/user/summary           - User overview
GET /api/v1/analytics/urls/{id}/timeseries   - Click trends
GET /api/v1/analytics/urls/{id}/geographic   - Geographic breakdown
```

**Responsibilities**:
- Aggregate click data from events table
- Generate reports and charts
- Cache computed statistics
- Export data (CSV, JSON)

**Database Schema**:
```sql
CREATE TABLE click_events (
    id BIGSERIAL PRIMARY KEY,
    url_id BIGINT REFERENCES urls(id),
    clicked_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    country VARCHAR(2),
    city VARCHAR(100),
    device_type VARCHAR(20)
);

CREATE INDEX idx_url_id_clicked ON click_events(url_id, clicked_at DESC);
CREATE INDEX idx_clicked_at ON click_events(clicked_at);

-- Materialized view for fast aggregates
CREATE MATERIALIZED VIEW daily_url_stats AS
SELECT 
    url_id,
    DATE(clicked_at) as date,
    COUNT(*) as clicks,
    COUNT(DISTINCT ip_address) as unique_visitors
FROM click_events
GROUP BY url_id, DATE(clicked_at);
```

---

### 6. Worker Service
**Technology**: Python (Celery or custom worker)  
**Purpose**: Process async jobs from queue  
**Deployment**: Kubernetes Deployment (3 replicas)  

**Job Types**:
1. **Click Event Processing**: Consume from RabbitMQ, write to PostgreSQL
2. **URL Cleanup**: Delete expired URLs (daily cron)
3. **Analytics Aggregation**: Refresh materialized views (hourly)
4. **Email Notifications**: Send usage reports
5. **Backup Jobs**: Export data to S3

**Why Message Queue** (Interview Point):
> "Decouples redirect service from analytics. Redirect can return immediately without waiting for database writes. If analytics service is down, events queue up and process when it recovers. Enables async processing and better failure isolation."

---

### 7. Admin Dashboard
**Technology**: React, Nginx  
**Purpose**: Internal administration interface  
**Deployment**: Kubernetes Deployment (2 replicas)  

**Features**:
- System health overview
- User management
- Content moderation (ban malicious URLs)
- Real-time metrics dashboard
- Configuration management

**Access Control**:
- Separate authentication (admin-only OAuth scope)
- IP whitelist (optional)
- Audit logging

---

## Data Layer

### PostgreSQL
**Deployment**: StatefulSet with 3 replicas (1 primary, 2 read replicas)  
**Version**: PostgreSQL 15  
**Storage**: EBS volumes (gp3), 100GB initial  

**Backup Strategy**:
- Automated daily backups to S3 (AWS Backup)
- Point-in-time recovery (WAL archiving)
- Retention: 30 days

**High Availability**:
- Patroni for automatic failover
- PgBouncer for connection pooling
- Read replicas for analytics queries

---

### Redis
**Deployment**: Kubernetes Deployment with 3 replicas (Redis Cluster or Sentinel)  
**Version**: Redis 7  
**Purpose**: 
- URL cache (primary use case)
- Session storage
- Rate limiting counters
- Real-time leaderboards

**Configuration**:
- Max memory: 4GB per instance
- Eviction policy: `allkeys-lru`
- Persistence: RDB snapshots every 5 minutes
- AOF disabled (cache is ephemeral)

**Cache Strategy**:
```python
# Cache-aside pattern
def get_url(short_code):
    # Try cache first
    cached = redis.hgetall(f"url:{short_code}")
    if cached:
        return cached
    
    # Cache miss - query database
    url = db.query(URL).filter_by(short_code=short_code).first()
    if url:
        # Populate cache with 1 hour TTL
        redis.hmset(f"url:{short_code}", {
            "original_url": url.original_url,
            "user_id": url.user_id
        })
        redis.expire(f"url:{short_code}", 3600)
    
    return url
```

---

### RabbitMQ
**Deployment**: StatefulSet with 3 replicas (cluster mode)  
**Version**: RabbitMQ 3.12  
**Purpose**: Message queue for async job processing  

**Queues**:
1. `click_events` - High-throughput queue for click tracking
2. `email_jobs` - Email notifications
3. `cleanup_jobs` - Periodic cleanup tasks
4. `analytics_jobs` - Aggregation tasks

**Configuration**:
- Durable queues (survive restarts)
- Message persistence enabled
- Dead letter exchange for failed jobs
- TTL: 24 hours for unprocessed messages

---

## DevOps Infrastructure

### 1. Containerization (Docker)

**Base Images**:
- Python services: `python:3.11-slim`
- Frontend: `node:18-alpine` (build), `nginx:alpine` (runtime)

**Multi-Stage Build Example**:
```dockerfile
# URL Service Dockerfile
FROM python:3.11-slim AS base
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM base AS development
COPY . .
CMD ["uvicorn", "main:app", "--reload", "--host", "0.0.0.0"]

FROM base AS production
COPY . .
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser
CMD ["gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

**Security Best Practices**:
- Non-root user in containers
- Multi-stage builds to reduce image size
- `.dockerignore` to exclude unnecessary files
- Security scanning with Trivy
- Signed images (optional: Cosign)

---

### 2. Orchestration (Kubernetes)

**Cluster Setup**:
- Platform: Amazon EKS
- Kubernetes version: 1.28+
- Node groups: 
  - General purpose: `t3.medium` (3-10 nodes, auto-scaling)
  - High CPU for redirects: `c5.large` (2-5 nodes)
- Networking: AWS VPC CNI
- Storage: EBS CSI driver

**Namespaces**:
```
- default (avoid using)
- url-shortener-prod
- url-shortener-staging
- monitoring
- istio-system (service mesh)
- cert-manager (TLS certificates)
```

**Resource Requests/Limits**:
```yaml
# Redirect service (high traffic)
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 1Gi

# URL service (moderate traffic)
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 512Mi
```

**Auto-Scaling**:
- HPA (Horizontal Pod Autoscaler): CPU-based (70% target)
- Cluster Autoscaler: Node-level scaling
- KEDA (optional): Queue-depth based scaling for workers

---

### 3. Package Management (Helm)

**Chart Structure**:
```
helm/
├── url-shortener/
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── values-prod.yaml
│   ├── values-staging.yaml
│   └── templates/
│       ├── deployment-url-service.yaml
│       ├── deployment-redirect-service.yaml
│       ├── deployment-analytics-service.yaml
│       ├── deployment-worker-service.yaml
│       ├── deployment-frontend.yaml
│       ├── statefulset-postgres.yaml
│       ├── statefulset-rabbitmq.yaml
│       ├── deployment-redis.yaml
│       ├── service.yaml
│       ├── ingress.yaml
│       ├── configmap.yaml
│       ├── secret.yaml
│       ├── hpa.yaml
│       └── networkpolicy.yaml
└── monitoring/
    ├── Chart.yaml
    └── templates/
        ├── prometheus.yaml
        ├── grafana.yaml
        └── alertmanager.yaml
```

**Values Structure**:
```yaml
# values-prod.yaml
global:
  environment: production
  domain: short.yourdomain.com

urlService:
  replicaCount: 5
  image:
    repository: yourdockerhub/url-service
    tag: "1.2.3"
  autoscaling:
    enabled: true
    minReplicas: 5
    maxReplicas: 20

redirectService:
  replicaCount: 10
  autoscaling:
    enabled: true
    minReplicas: 10
    maxReplicas: 50

postgres:
  persistence:
    size: 100Gi
  resources:
    requests:
      memory: 2Gi
      cpu: 1000m
```

---

### 4. CI/CD Pipeline (GitHub Actions)

**Workflow Triggers**:
- Push to `main` → Deploy to production
- Push to `develop` → Deploy to staging
- Pull requests → Run tests, security scans
- Tags (`v*`) → Create release

**Pipeline Stages**:
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    - Run Black (Python formatter)
    - Run Flake8 (linter)
    - Run pytest (unit tests)
    - Run integration tests
    
  security-scan:
    - Scan dependencies (Snyk/Dependabot)
    - Scan Docker images (Trivy)
    - SAST analysis (SonarQube)
    
  build-and-push:
    - Build Docker images
    - Tag with commit SHA and semantic version
    - Push to Docker Hub / ECR
    - Sign images (Cosign)
    
  deploy-staging:
    - Update Helm values with new image tags
    - Deploy to staging cluster via ArgoCD
    - Run smoke tests
    
  deploy-production:
    (on main branch only)
    - Require manual approval
    - Update Helm values
    - Deploy to production via ArgoCD
    - Run smoke tests
    - Rollback on failure
```

**Secret Management in Pipeline**:
- GitHub Secrets for:
  - Docker Hub credentials
  - AWS credentials (OIDC preferred)
  - Kubernetes config (via AWS IAM)
  - Slack webhook for notifications

---

### 5. GitOps (ArgoCD)

**Repository Structure**:
```
repos/
├── app-code/                 # Application source code
│   ├── url-service/
│   ├── redirect-service/
│   └── ...
├── helm-charts/              # Helm charts
│   └── url-shortener/
└── gitops-config/            # ArgoCD applications
    ├── applications/
    │   ├── url-shortener-prod.yaml
    │   └── url-shortener-staging.yaml
    └── projects/
        └── url-shortener-project.yaml
```

**ArgoCD Application**:
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: url-shortener-prod
  namespace: argocd
spec:
  project: url-shortener
  source:
    repoURL: https://github.com/yourusername/helm-charts
    targetRevision: main
    path: url-shortener
    helm:
      valueFiles:
        - values-prod.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: url-shortener-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

**Why GitOps** (Interview Point):
> "Git becomes the single source of truth for infrastructure state. Deployments are declarative and auditable. ArgoCD continuously monitors Git and auto-syncs. If someone manually changes K8s, ArgoCD reverts it. Rollback is just a git revert."

---

### 6. Infrastructure as Code (Terraform)

**Terraform Structure**:
```
terraform/
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── eks/
│   ├── rds/
│   ├── s3/
│   └── secrets-manager/
├── environments/
│   ├── prod/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   └── staging/
│       └── ...
└── README.md
```

**Resources Managed by Terraform**:
```hcl
# Production environment
module "vpc" {
  source = "../../modules/vpc"
  
  cidr_block           = "10.0.0.0/16"
  availability_zones   = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets      = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets       = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  enable_nat_gateway   = true
  enable_dns_hostnames = true
}

module "eks" {
  source = "../../modules/eks"
  
  cluster_name    = "url-shortener-prod"
  cluster_version = "1.28"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  
  node_groups = {
    general = {
      desired_size = 3
      min_size     = 3
      max_size     = 10
      instance_types = ["t3.medium"]
    }
    high_cpu = {
      desired_size = 2
      min_size     = 2
      max_size     = 5
      instance_types = ["c5.large"]
    }
  }
}

module "rds" {
  source = "../../modules/rds"
  
  identifier        = "url-shortener-prod"
  engine            = "postgres"
  engine_version    = "15.3"
  instance_class    = "db.t3.medium"
  allocated_storage = 100
  
  vpc_id            = module.vpc.vpc_id
  subnet_ids        = module.vpc.database_subnet_ids
  
  backup_retention_period = 30
  multi_az               = true
}
```

**State Management**:
- Backend: S3 bucket with DynamoDB lock table
- State encryption: AWS KMS
- State file per environment
- Remote state sharing between modules

---

### 7. Configuration Management (Ansible)

**Use Cases**:
1. **Initial node setup**: Install monitoring agents, configure logging
2. **Security hardening**: CIS benchmarks, kernel parameters
3. **Cluster maintenance**: Drain nodes, update components
4. **Compliance checks**: Automated auditing

**Playbook Example**:
```yaml
# playbooks/k8s-node-setup.yaml
---
- name: Configure Kubernetes Worker Nodes
  hosts: k8s_workers
  become: true
  
  tasks:
    - name: Install node monitoring agents
      include_role:
        name: prometheus_node_exporter
    
    - name: Configure log forwarding
      include_role:
        name: promtail
    
    - name: Harden kernel parameters
      sysctl:
        name: "{{ item.name }}"
        value: "{{ item.value }}"
        state: present
      loop:
        - { name: 'net.ipv4.ip_forward', value: '1' }
        - { name: 'net.bridge.bridge-nf-call-iptables', value: '1' }
    
    - name: Set up automated security updates
      include_role:
        name: unattended_upgrades
```

**Inventory**:
```ini
[k8s_workers]
10.0.1.10 ansible_user=ec2-user
10.0.1.11 ansible_user=ec2-user
10.0.1.12 ansible_user=ec2-user

[k8s_workers:vars]
environment=production
region=us-east-1
```

---

### 8. Monitoring & Observability

**Metrics (Prometheus)**:
```
Scrape Targets:
├── Kubernetes metrics (kube-state-metrics, node-exporter)
├── Application metrics (custom /metrics endpoints)
├── Redis metrics (redis-exporter)
├── PostgreSQL metrics (postgres-exporter)
├── RabbitMQ metrics (rabbitmq-exporter)
└── Istio metrics (if using service mesh)

Custom Application Metrics:
- url_service_creation_requests_total (counter)
- url_service_creation_duration_seconds (histogram)
- redirect_service_requests_total (counter)
- redirect_service_cache_hit_ratio (gauge)
- analytics_service_query_duration_seconds (histogram)
```

**Dashboards (Grafana)**:
1. **Infrastructure Overview**: Cluster health, node metrics, pod status
2. **Application Performance**: Request rates, latencies, error rates (RED metrics)
3. **Business Metrics**: URLs created/day, total redirects, active users
4. **Database Performance**: Query performance, connection pools, replication lag
5. **Cost Tracking**: Resource utilization vs. allocated, estimated AWS costs

**Alerts (AlertManager)**:
```yaml
# Example alerts
groups:
  - name: application_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} per second"
      
      - alert: RedirectServiceDown
        expr: up{job="redirect-service"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redirect service is down"
      
      - alert: DatabaseConnectionsHigh
        expr: pg_stat_database_numbackends > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Database connection count is high"
```

**Logging (Loki + Promtail)**:
- All container logs collected by Promtail
- Centralized in Loki
- Retention: 30 days
- Queryable via Grafana
- Structured logging (JSON format)

**Log Format**:
```json
{
  "timestamp": "2024-01-20T12:34:56Z",
  "level": "INFO",
  "service": "url-service",
  "pod": "url-service-7d5f9b8c-xk2p9",
  "trace_id": "abc123def456",
  "message": "URL created successfully",
  "user_id": 42,
  "short_code": "aBc123",
  "duration_ms": 45
}
```

**Tracing (Jaeger)** (Optional but impressive):
- Distributed tracing across microservices
- Track request flow from API Gateway → Services → Database
- Identify bottlenecks
- OpenTelemetry instrumentation

---

## Security Architecture

### 1. Network Security

**Network Policies**:
```yaml
# Only allow specific service-to-service communication
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: url-service-policy
spec:
  podSelector:
    matchLabels:
      app: url-service
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - port: 8000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - port: 5432
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - port: 6379
```

**Service Mesh (Istio)** (Optional):
- Mutual TLS between services
- Fine-grained authorization policies
- Traffic management (retries, timeouts, circuit breaking)

---

### 2. Authentication & Authorization

**OAuth2 Flow**:
```
1. User → Frontend
2. Frontend → Auth0 / Cognito
3. Auth0 returns JWT token
4. Frontend includes JWT in API requests
5. API Gateway validates JWT
6. Gateway forwards request with user context
```

**API Key for Programmatic Access**:
- API keys stored in PostgreSQL (hashed)
- Rate limiting per API key
- Scoped permissions (read-only vs. full access)

---

### 3. Secrets Management

**AWS Secrets Manager**:
- Database credentials
- API keys (third-party services)
- OAuth client secrets

**Kubernetes Secrets** (created by External Secrets Operator):
- Pulls from AWS Secrets Manager
- Auto-rotates secrets
- Mounted as environment variables or files

**External Secrets Operator**:
```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1

---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets
  target:
    name: postgres-secret
  data:
    - secretKey: username
      remoteRef:
        key: prod/database/credentials
        property: username
    - secretKey: password
      remoteRef:
        key: prod/database/credentials
        property: password
```

---

### 4. Container Security

**Image Scanning**:
- Trivy scans in CI pipeline
- Block deployment if critical vulnerabilities found
- Daily scans of running images

**Pod Security Standards**:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: url-shortener-prod
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

**Security Context**:
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000
  capabilities:
    drop:
      - ALL
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
```

---

### 5. Data Security

**Encryption**:
- **In Transit**: TLS 1.3 for all external communication
- **At Rest**: 
  - EBS volumes encrypted (AWS KMS)
  - Database encryption enabled
  - S3 bucket encryption (AES-256)

**Backup Encryption**:
- Database backups encrypted before upload to S3
- Backup retention: 30 days
- Test restores monthly (automated)

---

### 6. Compliance & Auditing

**Audit Logging**:
- Kubernetes audit logs → CloudWatch
- Application audit logs (user actions)
- API Gateway access logs

**Compliance**:
- GDPR considerations (user data deletion)
- Data retention policies
- Terms of service enforcement

---

## Cost Optimization

**Resource Right-Sizing**:
- Regularly review metrics to adjust requests/limits
- Use Spot instances for non-critical workloads
- Cluster autoscaler to scale down during low traffic

**Estimated Monthly Costs** (AWS US-East-1):
```
EKS Control Plane:              $73
EC2 Instances (t3.medium x 3):  $75
EC2 Instances (c5.large x 2):   $140
RDS (db.t3.medium):             $60
EBS Volumes:                    $20
ALB:                            $25
Data Transfer:                  $50
S3 (backups):                   $10
CloudWatch:                     $15
-----------------------------------------
Total (estimated):              $468/month
```

**Cost Monitoring**:
- AWS Cost Explorer alerts
- Grafana dashboard with cost metrics
- Monthly cost review

---

## Disaster Recovery

**RTO (Recovery Time Objective)**: 1 hour  
**RPO (Recovery Point Objective)**: 5 minutes (database)

**Backup Strategy**:
1. **Database**: Automated daily snapshots + WAL archiving
2. **Redis**: Not backed up (cache can be rebuilt)
3. **RabbitMQ**: Persistent queues, backed up hourly
4. **Configuration**: All in Git (infrastructure as code)

**Recovery Procedures**:
1. **Database failure**: Promote read replica to primary (automated by Patroni)
2. **Cluster failure**: Terraform re-provision in different AZ/region
3. **Data corruption**: Restore from S3 backup

**Testing**:
- Monthly DR drills
- Restore to staging environment
- Document lessons learned

---

## Development Workflow

### Local Development

**Prerequisites**:
- Docker Desktop
- kubectl
- Helm
- k3d or Minikube (local K8s)
- Python 3.11+
- Node.js 18+

**Setup**:
```bash
# 1. Clone repository
git clone https://github.com/yourusername/url-shortener
cd url-shortener

# 2. Start local Kubernetes
k3d cluster create url-shortener-dev

# 3. Deploy dependencies (Postgres, Redis, RabbitMQ)
helm install postgres bitnami/postgresql -f local-values.yaml
helm install redis bitnami/redis
helm install rabbitmq bitnami/rabbitmq

# 4. Run services locally
cd url-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# 5. Run frontend
cd ../frontend
npm install
npm start
```

**Docker Compose** (Alternative):
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: urlshortener
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: devpass
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
  
  url-service:
    build: ./url-service
    environment:
      DATABASE_URL: postgresql://dev:devpass@postgres/urlshortener
      REDIS_URL: redis://redis:6379
    ports:
      - "8001:8000"
    depends_on:
      - postgres
      - redis
```

---

### Git Workflow

**Branching Strategy** (GitHub Flow):
```
main (production)
  ├── develop (staging)
  │   ├── feature/short-code-generation
  │   ├── feature/analytics-dashboard
  │   └── bugfix/cache-invalidation
```

**Commit Messages** (Conventional Commits):
```
feat: add geographic analytics endpoint
fix: resolve Redis connection pool leak
docs: update deployment instructions
chore: bump dependencies
test: add integration tests for URL service
```

**Pull Request Process**:
1. Create feature branch
2. Implement changes + tests
3. Open PR with description
4. Automated checks run (lint, test, security scan)
5. Code review required
6. Merge to develop → auto-deploy to staging
7. After validation, merge develop → main → deploy to production

---

## Testing Strategy

### 1. Unit Tests
- **Coverage target**: 80%+
- **Framework**: pytest
- **Mocking**: Database, Redis, RabbitMQ

```python
# tests/test_url_service.py
def test_create_short_url(client, db_session):
    response = client.post("/api/v1/urls", json={
        "original_url": "https://example.com/very/long/path"
    })
    assert response.status_code == 201
    assert "short_code" in response.json()
    assert len(response.json()["short_code"]) == 7
```

### 2. Integration Tests
- Test service interactions
- Use test database
- Mock external services

### 3. End-to-End Tests
- Selenium/Playwright for frontend
- API tests with real services
- Run in CI after deployment to staging

### 4. Load Tests
- **Tool**: Locust or k6
- **Scenarios**:
  - 1000 RPS redirect load
  - 100 RPS URL creation
  - Burst traffic simulation

```python
# locustfile.py
from locust import HttpUser, task, between

class URLShortenerUser(HttpUser):
    wait_time = between(1, 3)
    
    @task(10)  # 10x more redirects than creates
    def redirect(self):
        self.client.get("/abc123")
    
    @task(1)
    def create_url(self):
        self.client.post("/api/v1/urls", json={
            "original_url": "https://example.com"
        })
```

### 5. Security Tests
- OWASP ZAP automated scans
- Penetration testing (manual, quarterly)
- Dependency scanning (Snyk, Dependabot)

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Redirect latency (p95) | < 50ms | Prometheus histogram |
| URL creation latency (p95) | < 200ms | Prometheus histogram |
| Availability | 99.9% | Uptime monitoring |
| Error rate | < 0.1% | Error logs / total requests |
| Cache hit rate | > 95% | Redis stats |
| Database query time (p95) | < 100ms | PostgreSQL logs |
| Concurrent users | 10,000+ | Load testing |

---

## Documentation Plan

**Repository Documentation**:
```
README.md                  - Project overview, quick start
ARCHITECTURE.md            - This document
CONTRIBUTING.md            - Contribution guidelines
DEPLOYMENT.md              - Deployment procedures
RUNBOOK.md                 - Operational procedures, troubleshooting
API.md                     - API documentation (OpenAPI/Swagger)
SECURITY.md                - Security policies and procedures
CHANGELOG.md               - Version history
docs/
  ├── setup/               - Local development setup
  ├── deployment/          - Deployment guides
  ├── operations/          - Runbooks, monitoring guides
  └── architecture/        - Architecture decision records (ADRs)
```

**API Documentation**:
- OpenAPI/Swagger specification
- Hosted on `/docs` endpoint (FastAPI auto-generated)
- Examples for all endpoints

**Architecture Decision Records (ADRs)**:
```markdown
# ADR-001: Use Redis for URL Caching

## Status
Accepted

## Context
Redirect service needs sub-50ms latency. Database queries take 20-50ms.

## Decision
Use Redis as cache-aside pattern for URL lookups.

## Consequences
- Positive: Dramatically improves redirect performance
- Positive: Reduces database load
- Negative: Cache invalidation complexity
- Negative: Additional infrastructure component
```

---

## Milestones & Timeline

### Milestone 1: Foundation (Weeks 1-2)
**Deliverables**:
- Repository structure created
- Python services scaffolded (URL, Redirect, Analytics, Worker)
- Dockerfiles with multi-stage builds
- Docker Compose for local development
- Unit tests for core logic
- CI pipeline (lint, test)

**Skills Demonstrated**: Docker, Python, Testing, Git

---

### Milestone 2: Kubernetes Basics (Weeks 3-4)
**Deliverables**:
- Kubernetes manifests (Deployments, Services)
- Local K8s deployment (k3d/Minikube)
- ConfigMaps and Secrets
- Health checks (liveness, readiness)
- Resource requests/limits

**Skills Demonstrated**: Kubernetes fundamentals, YAML, kubectl

---

### Milestone 3: Stateful Workloads (Week 5)
**Deliverables**:
- PostgreSQL StatefulSet with PVC
- Redis deployment
- RabbitMQ StatefulSet
- Database initialization (migrations)
- Data persistence verification

**Skills Demonstrated**: StatefulSets, Persistent Volumes, Database management

---

### Milestone 4: Package Management (Week 6)
**Deliverables**:
- Helm chart created
- Parameterized values files (dev, staging, prod)
- Chart dependencies (Postgres, Redis from Bitnami)
- Chart documentation
- Helm deployment tested

**Skills Demonstrated**: Helm, templating, package management

---

### Milestone 5: CI/CD Pipeline (Weeks 7-8)
**Deliverables**:
- GitHub Actions workflows
- Automated testing in pipeline
- Docker image building and pushing
- Security scanning (Trivy)
- Deployment to staging on merge

**Skills Demonstrated**: GitHub Actions, CI/CD, automation

---

### Milestone 6: GitOps (Week 9)
**Deliverables**:
- ArgoCD installed on cluster
- ArgoCD applications configured
- Git-based deployment workflow
- Auto-sync and self-heal enabled
- Rollback tested

**Skills Demonstrated**: GitOps, ArgoCD, declarative deployments

---

### Milestone 7: Infrastructure as Code (Weeks 10-11)
**Deliverables**:
- Terraform modules (VPC, EKS, RDS)
- Environment configurations (staging, prod)
- Remote state in S3
- EKS cluster provisioned
- RDS instance created

**Skills Demonstrated**: Terraform, AWS, IaC

---

### Milestone 8: Configuration Management (Week 12)
**Deliverables**:
- Ansible playbooks for node setup
- Inventory management
- Security hardening scripts
- Automated agent installation
- Playbook documentation

**Skills Demonstrated**: Ansible, configuration management, automation

---

### Milestone 9: Monitoring & Observability (Weeks 13-14)
**Deliverables**:
- Prometheus deployed
- Grafana dashboards created
- AlertManager configured
- Loki + Promtail for logging
- Custom application metrics
- Alert testing

**Skills Demonstrated**: Prometheus, Grafana, observability, SRE practices

---

### Milestone 10: Production Hardening (Weeks 15-16)
**Deliverables**:
- Network policies implemented
- Secrets management (External Secrets Operator)
- TLS/HTTPS configured
- Rate limiting enabled
- Security scanning in production
- RBAC configured
- Pod security standards enforced
- Disaster recovery tested

**Skills Demonstrated**: Security, production best practices, compliance

---

### Milestone 11: Documentation & Presentation (Week 17)
**Deliverables**:
- Complete documentation
- Architecture diagrams
- Demo video/presentation
- Blog post about the project
- Resume updates
- LinkedIn portfolio piece

**Skills Demonstrated**: Communication, documentation, technical writing

---

## Interview Talking Points

### Architecture Questions

**Q: Why did you choose microservices over a monolith?**
> "The URL shortener has distinct scaling requirements. The redirect service receives 1000x more traffic than URL creation and benefits from aggressive caching. Analytics has different resource needs for data aggregation. Microservices let me scale each component independently and choose optimal technologies per service."

**Q: How does your caching strategy work?**
> "I use a cache-aside pattern with Redis. When a redirect request comes in, we check Redis first. On cache hit (~95%), we return in <10ms. On miss, we query PostgreSQL, populate Redis with 1-hour TTL, and return. This keeps redirect latency under 50ms at p95 while reducing database load by 95%."

**Q: How do you handle database failures?**
> "PostgreSQL runs as a StatefulSet with Patroni for automatic failover. There's 1 primary and 2 read replicas. If the primary fails, Patroni promotes a replica within 30 seconds. For disaster recovery, I have automated daily backups to S3 with 30-day retention and WAL archiving for point-in-time recovery."

**Q: Explain your CI/CD process**
> "Code commits trigger GitHub Actions which runs linting, tests, and security scans. On success, it builds Docker images tagged with commit SHA, scans them with Trivy, and pushes to the registry. For staging deploys, the pipeline updates Helm values in the GitOps repo. ArgoCD detects the change and syncs to the cluster. Production deploys require manual approval and include smoke tests before declaring success."

**Q: How do you ensure secrets don't get committed to Git?**
> "Multiple layers: git-secrets pre-commit hook prevents accidental commits, .gitignore excludes sensitive files, and .env files are never committed. In production, secrets live in AWS Secrets Manager and are injected into pods via the External Secrets Operator. The pipeline uses GitHub Secrets for credentials, accessed via OIDC to avoid long-lived credentials."

**Q: How would you scale this to 1 million requests per second?**
> "Several approaches: (1) Horizontal scaling - HPA can scale redirect service to 100+ pods, (2) Database read replicas - route analytics queries to replicas, (3) CDN - put CloudFront in front for geographic distribution, (4) Caching layers - add Redis cluster mode and increase cache TTL, (5) Regional deployments - multi-region setup with global load balancing, (6) Queue-based URL creation - if writes become a bottleneck, queue creation requests."

---

### Operations Questions

**Q: How do you monitor this system?**
> "Three layers of observability: (1) Metrics - Prometheus scrapes application and infrastructure metrics, Grafana visualizes with custom dashboards for RED metrics and business KPIs, (2) Logging - Loki centralizes all pod logs with structured JSON format for easy querying, (3) Alerting - AlertManager sends critical alerts to Slack, warning alerts to email. I've defined SLIs/SLOs: 99.9% availability, <50ms redirect latency at p95."

**Q: Walk me through troubleshooting a production outage**
> "First, check Grafana dashboards for obvious anomalies. Next, query Loki for error logs filtered by time range and service. Use kubectl to check pod status and describe failing pods. If it's a specific service, exec into a pod to check network connectivity, disk space, and resource constraints. Review recent deployments in ArgoCD - might need to rollback. Check Prometheus for resource saturation. Once resolved, write a postmortem documenting root cause, impact, timeline, and action items to prevent recurrence."

**Q: How do you handle rolling updates with zero downtime?**
> "Kubernetes rolling updates with proper configuration: (1) Readiness probes ensure new pods are ready before receiving traffic, (2) PodDisruptionBudget ensures minimum pods always available, (3) Graceful shutdown - SIGTERM handling gives pods 30s to finish requests, (4) Pre-stop hooks drain connections, (5) Update strategy maxSurge=1, maxUnavailable=0 ensures no capacity loss. For databases, I use blue-green deployment or read replica promotion."

---

### Security Questions

**Q: How do you secure this application?**
> "Defense in depth: (1) Network - network policies restrict pod-to-pod communication, AWS security groups limit external access, (2) Authentication - OAuth2 for users, API keys for programmatic access, (3) Secrets - AWS Secrets Manager with automatic rotation, never in Git, (4) Container security - run as non-root, read-only filesystem, no privileged containers, regular Trivy scans, (5) TLS everywhere - between services and externally, (6) RBAC - least privilege for K8s service accounts, (7) Rate limiting - prevent abuse, (8) Input validation - prevent injection attacks."

**Q: How do you handle secrets rotation?**
> "External Secrets Operator pulls from AWS Secrets Manager with a 1-hour refresh. When secrets change in AWS, ESO updates K8s secrets. Pods are configured to watch for secret changes and reload configuration without restart. For database credentials, I use AWS Secrets Manager rotation with a Lambda function that updates both the database and Secrets Manager atomically."

---

### DevOps Culture Questions

**Q: How do you ensure reliability?**
> "SRE principles: (1) Define SLOs (99.9% availability, <50ms latency), (2) Error budgets - track actual vs. target, use budget to make feature vs. reliability tradeoff decisions, (3) Blameless postmortems after incidents, (4) Chaos engineering - regularly test failure scenarios, (5) Automated testing - unit, integration, e2e, load tests prevent regressions, (6) Gradual rollouts - canary deployments catch issues before full rollout."

**Q: How do you balance velocity with stability?**
> "Automation is key. Comprehensive CI/CD lets us deploy multiple times per day safely. Automated testing catches bugs early. Feature flags let us deploy code dark and enable gradually. Monitoring and alerting catch issues quickly. GitOps makes rollback trivial. This creates a 'safety net' that enables fast iteration without sacrificing stability."

---

## Success Metrics for This Project

**Technical Metrics**:
- ✅ All services containerized and running in K8s
- ✅ Automated CI/CD pipeline with <10 minute deploy time
- ✅ 80%+ test coverage
- ✅ Zero secrets in Git (automated checking)
- ✅ Complete monitoring with alerts
- ✅ Sub-50ms redirect latency at p95
- ✅ Successful disaster recovery drill

**Career Metrics**:
- ✅ Portfolio piece to showcase in interviews
- ✅ Hands-on experience with full DevOps stack
- ✅ Demonstrable knowledge of best practices
- ✅ Talking points for every item in course syllabus
- ✅ GitHub repository with clean commits and documentation
- ✅ Confidence to discuss architecture decisions

---

## Next Steps

1. **Review this architecture** - Ask questions, suggest changes
2. **Set up GitHub repository** - Initialize with proper structure
3. **Begin Milestone 1** - Start building the foundation
4. **Use Claude Code for implementation** - I'll provide guidance on best practices
5. **Iterate and learn** - Each milestone builds on the last

---

## Questions to Discuss

Before we start implementation:

1. **Cloud provider**: Stick with AWS or want to try GCP/Azure?
2. **Domain name**: Do you have a domain for this? (Can use free DNS services)
3. **Budget**: Comfortable with ~$500/month for AWS or prefer local-only initially?
4. **Timeline**: Aiming for 17 weeks or want to accelerate/decelerate?
5. **Focus areas**: Any technologies you want to emphasize or skip?

---

*This document will be your north star. Keep it handy for all milestone conversations. We'll reference back to this architecture as we build each component.*
