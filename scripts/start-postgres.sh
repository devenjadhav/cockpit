#!/bin/bash

# Start PostgreSQL with Docker Compose for Daydream Portal

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "Starting PostgreSQL for Daydream Portal..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please copy .env.example to .env and configure your settings:"
    echo "  cp .env.example .env"
    echo "  # Edit .env with your configuration"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Validate required variables
if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "Error: POSTGRES_PASSWORD not set in .env file!"
    exit 1
fi

# Start PostgreSQL container
echo "Starting PostgreSQL container..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
TIMEOUT=30
ELAPSED=0
while ! docker-compose exec postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
    if [ $ELAPSED -ge $TIMEOUT ]; then
        echo "❌ PostgreSQL failed to start within $TIMEOUT seconds"
        echo "Check the logs with: docker-compose logs postgres"
        exit 1
    fi
    echo "Waiting for PostgreSQL..."
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done

echo "✅ PostgreSQL is ready!"
echo "Connection details:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: $POSTGRES_DB"
echo "  User: $POSTGRES_USER"
echo ""
echo "You can connect using:"
echo "  psql -h localhost -p 5432 -U $POSTGRES_USER -d $POSTGRES_DB"
