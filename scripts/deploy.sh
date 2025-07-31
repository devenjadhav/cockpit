#!/bin/bash

# Production Deployment Script for Coolify
set -e

echo "🚀 Starting production deployment..."

# Check if required environment file exists
if [[ ! -f .env.production.local ]]; then
    echo "❌ Error: .env.production.local file not found!"
    echo "📝 Please copy .env.production to .env.production.local and fill in your values"
    exit 1
fi

# Load production environment variables
set -a
source .env.production.local
set +a

# Validate required environment variables
required_vars=(
    "JWT_SECRET"
    "POSTGRES_HOST"
    "POSTGRES_PASSWORD"
    "AIRTABLE_API_KEY"
    "AIRTABLE_BASE_ID"
    "NEXT_PUBLIC_API_URL"
)

for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo "❌ Error: Required environment variable $var is not set"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Build and test before deployment
echo "🔨 Building backend..."
npm run build

echo "🔨 Building frontend..."
cd frontend
npm run build
cd ..

echo "🧪 Running tests..."
npm test

echo "🐳 Building Docker images..."
docker-compose -f docker-compose.production.yml build

echo "🔍 Running security audit..."
npm run security-audit

echo "✅ Pre-deployment checks complete!"
echo "📋 Next steps for Coolify deployment:"
echo "1. Push your code to your Git repository"
echo "2. Set up these environment variables in Coolify:"

for var in "${required_vars[@]}"; do
    echo "   - $var"
done

echo "3. Use docker-compose.production.yml as your Docker Compose file"
echo "4. Set the following ports in Coolify:"
echo "   - Frontend: 3000"
echo "   - Backend: 3001"
echo "   - Database: 5432 (internal)"

echo ""
echo "🎉 Ready for Coolify deployment!"
