#!/bin/bash

# Deployment startup script that runs database migrations before starting the server
# This ensures the database is always up-to-date with the latest schema

set -e  # Exit on any error

echo "🚀 Starting Daydream Portal deployment..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
timeout=60
while ! pg_isready -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-daydream_user}" -d "${POSTGRES_DB:-daydream_portal}" &> /dev/null; do
    echo "Waiting for database connection..."
    sleep 2
    timeout=$((timeout - 2))
    if [ $timeout -le 0 ]; then
        echo "❌ Database connection timeout"
        exit 1
    fi
done

echo "✅ Database is ready"

# Run database migrations
echo "🔄 Running database migrations..."
node scripts/migrate-db.js

if [ $? -eq 0 ]; then
    echo "✅ Database migrations completed successfully"
else
    echo "❌ Database migrations failed"
    exit 1
fi

# Start the application
echo "🚀 Starting application server..."
exec node dist/index.js
