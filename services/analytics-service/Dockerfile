# Build stage
FROM python:3.13-slim AS builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies to a specific location
RUN pip install --no-cache-dir --target=/app/dependencies -r requirements.txt

# Development stage
FROM python:3.13-slim AS development

WORKDIR /app

# Install system dependencies for development
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run as non-root user
RUN useradd -m -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 3003

CMD ["python", "main.py"]

# Production stage
FROM python:3.13-slim AS production

WORKDIR /app

# Copy Python dependencies from builder
COPY --from=builder /app/dependencies /usr/local/lib/python3.13/site-packages/

# Copy application code
COPY app ./app
COPY main.py .

# Run as non-root user
RUN useradd -m -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:3003/health').read()" || exit 1

CMD ["python", "main.py"]