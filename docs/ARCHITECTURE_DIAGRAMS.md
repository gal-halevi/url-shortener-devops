# URL Shortener - Architecture Diagrams

## High-Level System Architecture

```mermaid
graph TB
    subgraph Internet
        Users[Users/Clients]
    end
    
    subgraph AWS["AWS Cloud"]
        subgraph Network["Network Layer"]
            Route53[Route53 DNS<br/>short.yourdomain.com]
            ALB[Application Load Balancer<br/>TLS Termination]
        end
        
        subgraph EKS["EKS Kubernetes Cluster"]
            subgraph Ingress["Ingress Layer"]
                Istio[Istio Gateway<br/>or<br/>NGINX Ingress]
            end
            
            subgraph AppNamespace["Application Namespace"]
                subgraph Frontend["Frontend Layer"]
                    WebUI[Frontend Service<br/>React + Nginx]
                    AdminUI[Admin Dashboard<br/>React + Nginx]
                end
                
                subgraph Gateway["API Layer"]
                    APIGateway[API Gateway<br/>Auth, Rate Limit, Routing]
                end
                
                subgraph Services["Microservices Layer"]
                    URLSvc[URL Service<br/>Create, Manage URLs]
                    RedirectSvc[Redirect Service<br/>Fast Lookups]
                    AnalyticsSvc[Analytics Service<br/>Stats, Reports]
                    WorkerSvc[Worker Service<br/>Async Jobs]
                end
                
                subgraph Data["Data Layer"]
                    Postgres[(PostgreSQL<br/>StatefulSet<br/>Primary + 2 Replicas)]
                    Redis[(Redis<br/>Cache + Sessions)]
                    RabbitMQ[(RabbitMQ<br/>Message Queue)]
                end
            end
            
            subgraph MonitoringNS["Monitoring Namespace"]
                Prometheus[Prometheus<br/>Metrics Collection]
                Grafana[Grafana<br/>Dashboards]
                Loki[Loki<br/>Log Aggregation]
                Alertmanager[AlertManager<br/>Alerts]
            end
        end
        
        subgraph External["External AWS Services"]
            SecretsManager[AWS Secrets Manager<br/>Credentials]
            S3[S3<br/>Backups]
            CloudWatch[CloudWatch<br/>Logs]
        end
    end
    
    Users --> Route53
    Route53 --> ALB
    ALB --> Istio
    Istio --> WebUI
    Istio --> AdminUI
    Istio --> APIGateway
    
    WebUI --> APIGateway
    AdminUI --> APIGateway
    APIGateway --> URLSvc
    APIGateway --> RedirectSvc
    APIGateway --> AnalyticsSvc
    
    URLSvc --> Postgres
    URLSvc --> Redis
    RedirectSvc --> Redis
    RedirectSvc --> Postgres
    RedirectSvc --> RabbitMQ
    AnalyticsSvc --> Postgres
    WorkerSvc --> RabbitMQ
    WorkerSvc --> Postgres
    
    Services --> Prometheus
    Prometheus --> Grafana
    Prometheus --> Alertmanager
    Services --> Loki
    
    Postgres -.Backup.-> S3
    Services -.Secrets.-> SecretsManager
    Services -.Logs.-> CloudWatch
    
    style EKS fill:#326CE5,color:#fff
    style AppNamespace fill:#4CAF50,color:#fff
    style MonitoringNS fill:#FF9800,color:#fff
    style Data fill:#9C27B0,color:#fff
```

## Request Flow - URL Creation

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant APIGateway
    participant URLService
    participant Redis
    participant PostgreSQL
    participant RabbitMQ
    
    User->>Frontend: Submit long URL
    Frontend->>APIGateway: POST /api/v1/urls<br/>(with JWT)
    APIGateway->>APIGateway: Validate JWT
    APIGateway->>APIGateway: Check rate limit
    APIGateway->>URLService: Forward request
    URLService->>URLService: Generate short code
    URLService->>URLService: Validate URL
    URLService->>PostgreSQL: INSERT url
    PostgreSQL-->>URLService: Success
    URLService->>Redis: Cache new URL<br/>(TTL: 1 hour)
    URLService-->>APIGateway: Return short URL
    APIGateway-->>Frontend: 201 Created
    Frontend-->>User: Display short URL
```

## Request Flow - URL Redirect (Hot Path)

```mermaid
sequenceDiagram
    participant User
    participant RedirectService
    participant Redis
    participant PostgreSQL
    participant RabbitMQ
    participant Worker
    
    User->>RedirectService: GET /abc123
    RedirectService->>Redis: GET url:abc123
    
    alt Cache Hit (95% of requests)
        Redis-->>RedirectService: {original_url, user_id}
        RedirectService->>RabbitMQ: Publish click event<br/>(async, non-blocking)
        RedirectService-->>User: 302 Redirect
        Note over RedirectService,User: Total time: ~10ms
    else Cache Miss (5% of requests)
        Redis-->>RedirectService: NULL
        RedirectService->>PostgreSQL: SELECT url WHERE short_code=?
        PostgreSQL-->>RedirectService: URL data
        RedirectService->>Redis: SET url:abc123<br/>(TTL: 1 hour)
        RedirectService->>RabbitMQ: Publish click event
        RedirectService-->>User: 302 Redirect
        Note over RedirectService,User: Total time: ~40ms
    end
    
    Note over RabbitMQ: Async processing (no blocking)
    RabbitMQ->>Worker: Consume click event
    Worker->>PostgreSQL: INSERT click_event
```

## CI/CD Pipeline Flow

```mermaid
graph LR
    subgraph Developer
        Dev[Developer<br/>Pushes Code]
    end
    
    subgraph GitHub
        Repo[GitHub Repository]
        Actions[GitHub Actions]
    end
    
    subgraph Pipeline["CI/CD Pipeline"]
        Lint[Lint & Format<br/>Black, Flake8]
        Test[Unit Tests<br/>pytest]
        Security[Security Scan<br/>Trivy, Snyk]
        Build[Build Docker<br/>Images]
        Push[Push to Registry<br/>Docker Hub/ECR]
        UpdateGit[Update GitOps<br/>Repo]
    end
    
    subgraph GitOps
        ArgoCD[ArgoCD]
        K8s[Kubernetes<br/>Cluster]
    end
    
    subgraph Validation
        Smoke[Smoke Tests]
        Notify[Slack Notification]
    end
    
    Dev --> Repo
    Repo --> Actions
    Actions --> Lint
    Lint --> Test
    Test --> Security
    Security --> Build
    Build --> Push
    Push --> UpdateGit
    UpdateGit --> ArgoCD
    ArgoCD --> K8s
    K8s --> Smoke
    Smoke --> Notify
    
    style Pipeline fill:#4CAF50,color:#fff
    style GitOps fill:#2196F3,color:#fff
    style Validation fill:#FF9800,color:#fff
```

## Kubernetes Pod Architecture

```mermaid
graph TB
    subgraph K8s["Kubernetes Cluster"]
        subgraph NS1["url-shortener-prod Namespace"]
            subgraph URLPods["URL Service Pods"]
                URL1[url-service-1]
                URL2[url-service-2]
                URL3[url-service-...]
            end
            
            subgraph RedirectPods["Redirect Service Pods (HPA)"]
                RED1[redirect-1]
                RED2[redirect-2]
                RED3[redirect-...]
                RED10[redirect-10+]
            end
            
            subgraph DB["StatefulSet - PostgreSQL"]
                PG1[postgres-0<br/>Primary]
                PG2[postgres-1<br/>Replica]
                PG3[postgres-2<br/>Replica]
            end
            
            subgraph Cache["Redis Deployment"]
                REDIS1[redis-1]
                REDIS2[redis-2]
            end
        end
        
        subgraph NS2["monitoring Namespace"]
            PROM[Prometheus]
            GRAF[Grafana]
        end
        
        subgraph Storage["Persistent Storage"]
            PVC1[PVC: postgres-0<br/>100Gi EBS]
            PVC2[PVC: postgres-1<br/>100Gi EBS]
            PVC3[PVC: postgres-2<br/>100Gi EBS]
        end
    end
    
    URLPods --> PG1
    RedirectPods --> REDIS1
    RedirectPods --> REDIS2
    RedirectPods --> PG2
    RedirectPods --> PG3
    
    PG1 --> PVC1
    PG2 --> PVC2
    PG3 --> PVC3
    
    PROM --> URLPods
    PROM --> RedirectPods
    PROM --> DB
    
    style NS1 fill:#4CAF50,color:#fff
    style NS2 fill:#FF9800,color:#fff
```

## Monitoring & Alerting Flow

```mermaid
graph TB
    subgraph Sources["Metric Sources"]
        App[Application Metrics<br/>/metrics endpoint]
        K8sMetrics[Kubernetes Metrics<br/>kube-state-metrics]
        NodeMetrics[Node Metrics<br/>node-exporter]
        DBMetrics[Database Metrics<br/>postgres-exporter]
    end
    
    subgraph Collection["Collection & Storage"]
        Prometheus[Prometheus<br/>Scrape & Store]
        Loki[Loki<br/>Log Aggregation]
    end
    
    subgraph Analysis["Visualization & Analysis"]
        Grafana[Grafana Dashboards]
    end
    
    subgraph Alerting["Alerting"]
        Rules[Alert Rules]
        AlertManager[AlertManager]
        Slack[Slack Notifications]
        Email[Email Alerts]
        PagerDuty[PagerDuty<br/>Critical Only]
    end
    
    App --> Prometheus
    K8sMetrics --> Prometheus
    NodeMetrics --> Prometheus
    DBMetrics --> Prometheus
    
    App -.Logs.-> Loki
    
    Prometheus --> Grafana
    Loki --> Grafana
    
    Prometheus --> Rules
    Rules --> AlertManager
    AlertManager --> Slack
    AlertManager --> Email
    AlertManager --> PagerDuty
    
    style Collection fill:#2196F3,color:#fff
    style Alerting fill:#F44336,color:#fff
```

## Security Layers

```mermaid
graph TB
    subgraph External["External Threats"]
        Internet[Internet]
    end
    
    subgraph Layer1["Layer 1: Network Security"]
        ALB[AWS ALB<br/>DDoS Protection]
        WAF[AWS WAF<br/>SQL Injection, XSS]
        SG[Security Groups<br/>Port Restrictions]
    end
    
    subgraph Layer2["Layer 2: Ingress Security"]
        TLS[TLS 1.3<br/>Certificate]
        RateLimit[Rate Limiting<br/>Per IP/User]
    end
    
    subgraph Layer3["Layer 3: Application Security"]
        Auth[OAuth2<br/>Authentication]
        APIKey[API Key<br/>Validation]
        InputVal[Input Validation<br/>Sanitization]
    end
    
    subgraph Layer4["Layer 4: Service Mesh"]
        mTLS[Mutual TLS<br/>Between Services]
        NetPol[Network Policies<br/>Pod-to-Pod Rules]
    end
    
    subgraph Layer5["Layer 5: Container Security"]
        NonRoot[Non-Root User]
        ReadOnly[Read-Only FS]
        SecCtx[Security Context]
    end
    
    subgraph Layer6["Layer 6: Data Security"]
        Encrypt[Encryption at Rest<br/>EBS/RDS]
        Secrets[Secrets Manager<br/>No Plaintext]
        Backup[Encrypted Backups<br/>S3]
    end
    
    Internet --> ALB
    ALB --> WAF
    WAF --> SG
    SG --> TLS
    TLS --> RateLimit
    RateLimit --> Auth
    Auth --> APIKey
    APIKey --> InputVal
    InputVal --> mTLS
    mTLS --> NetPol
    NetPol --> NonRoot
    NonRoot --> ReadOnly
    ReadOnly --> SecCtx
    SecCtx --> Encrypt
    Encrypt --> Secrets
    Secrets --> Backup
    
    style Layer1 fill:#F44336,color:#fff
    style Layer2 fill:#FF5722,color:#fff
    style Layer3 fill:#FF9800,color:#fff
    style Layer4 fill:#FFC107,color:#fff
    style Layer5 fill:#8BC34A,color:#fff
    style Layer6 fill:#4CAF50,color:#fff
```

## Infrastructure as Code Flow

```mermaid
graph LR
    subgraph Dev["Developer"]
        DevUser[Developer<br/>Writes Terraform]
    end
    
    subgraph VCS["Version Control"]
        Git[Git Repository<br/>terraform/]
    end
    
    subgraph Plan["Planning"]
        TFPlan[terraform plan<br/>Review Changes]
        Review[Code Review<br/>Pull Request]
    end
    
    subgraph Apply["Apply"]
        TFApply[terraform apply<br/>Create Resources]
    end
    
    subgraph AWS["AWS Cloud"]
        VPC[VPC + Subnets]
        EKS[EKS Cluster]
        RDS[RDS PostgreSQL]
        S3Bucket[S3 Buckets]
        IAM[IAM Roles]
    end
    
    subgraph State["State Management"]
        S3State[S3 Backend<br/>State File]
        DynamoDB[DynamoDB<br/>State Lock]
    end
    
    DevUser --> Git
    Git --> TFPlan
    TFPlan --> Review
    Review --> TFApply
    TFApply --> VPC
    TFApply --> EKS
    TFApply --> RDS
    TFApply --> S3Bucket
    TFApply --> IAM
    
    TFApply -.State.-> S3State
    TFApply -.Lock.-> DynamoDB
    
    style Plan fill:#2196F3,color:#fff
    style Apply fill:#4CAF50,color:#fff
    style AWS fill:#FF9800,color:#fff
```

## Disaster Recovery Flow

```mermaid
graph TB
    subgraph Normal["Normal Operations"]
        Primary[Primary Database<br/>postgres-0]
        Replica1[Replica 1<br/>postgres-1]
        Replica2[Replica 2<br/>postgres-2]
        Backup[Automated Backup<br/>Every 6 hours → S3]
    end
    
    subgraph Failure["Failure Scenario"]
        Detect[Patroni Detects<br/>Primary Failure]
        Promote[Auto-Promote<br/>Replica to Primary]
        Redirect[Update Service<br/>DNS/Endpoint]
        NewReplica[Spawn New<br/>Replica]
    end
    
    subgraph Recovery["Recovery"]
        Investigate[Investigate<br/>Root Cause]
        Restore[Restore Old Primary<br/>as New Replica]
        Verify[Verify Data<br/>Consistency]
    end
    
    Primary --> Backup
    Primary -.Replicate.-> Replica1
    Primary -.Replicate.-> Replica2
    
    Primary -->|Fails| Detect
    Detect --> Promote
    Promote --> Redirect
    Redirect --> NewReplica
    
    NewReplica --> Investigate
    Investigate --> Restore
    Restore --> Verify
    
    style Failure fill:#F44336,color:#fff
    style Recovery fill:#4CAF50,color:#fff
```

---

## Legend

- **Solid lines**: Data flow / Direct communication
- **Dashed lines**: Async / Background operations
- **Colors**:
  - Blue: Infrastructure/Platform layer
  - Green: Application layer
  - Orange: Monitoring/Observability
  - Red: Security/Critical paths
  - Purple: Data layer

