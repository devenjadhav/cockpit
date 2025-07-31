#!/bin/bash

# Database migration script for Daydream Portal

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "🔄 Running database migrations..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please copy .env.example to .env and configure your settings"
    exit 1
fi

# Load environment variables
source .env

# Validate required variables
if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "❌ POSTGRES_PASSWORD not set in .env file!"
    exit 1
fi

# Check if PostgreSQL is running
if ! docker-compose exec postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    echo "❌ PostgreSQL is not running!"
    echo "Start it with: ./scripts/start-postgres.sh"
    exit 1
fi

echo "📡 PostgreSQL is running, applying migrations..."

# Run the schema migration using Docker
echo "Applying schema migration..."
docker-compose exec -e PGPASSWORD=$POSTGRES_PASSWORD postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /docker-entrypoint-initdb.d/01_init_schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Database migrations completed successfully!"
else
    echo "❌ Database migrations failed!"
    exit 1
fi

echo ""
echo "📊 Database status:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: $POSTGRES_DB"
echo "  User: $POSTGRES_USER"
