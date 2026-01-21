# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o redirect-service ./cmd/server

# Development stage (for local development with hot reload)
FROM golang:1.25-alpine AS development

# Install air for hot reload
RUN go install github.com/cosmtrek/air@latest

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Run as non-root user
RUN addgroup -g 1001 -S gouser && \
    adduser -S gouser -u 1001 && \
    chown -R gouser:gouser /app

USER gouser

EXPOSE 3002

# Use air for hot reload
CMD ["air", "-c", ".air.toml"]

# Production stage (LAST STAGE - DEFAULT)
FROM alpine:latest AS production

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates

# Create non-root user
RUN addgroup -g 1001 -S gouser && \
    adduser -S gouser -u 1001

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/redirect-service .

# Switch to non-root user
USER gouser

EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

# Start application
CMD ["./redirect-service"]