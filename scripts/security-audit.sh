#!/bin/bash

# Security Audit Script
# Run this regularly to check for security vulnerabilities

echo "🔒 Running Security Audit for Daydream Portal"
echo "============================================="

# Check for dependency vulnerabilities
echo "📦 Checking npm dependencies..."
npm audit --audit-level=low

if [ $? -ne 0 ]; then
    echo "❌ Vulnerabilities found in dependencies!"
    echo "Run 'npm audit fix' to attempt automatic fixes"
    exit 1
else
    echo "✅ No vulnerabilities found in dependencies"
fi

# Check environment variables
echo ""
echo "🔑 Checking environment variables..."

if [ -z "$JWT_SECRET" ]; then
    echo "❌ JWT_SECRET not set"
    exit 1
else
    # Check JWT secret strength
    if [ ${#JWT_SECRET} -lt 32 ]; then
        echo "⚠️  JWT_SECRET should be at least 32 characters long"
    else
        echo "✅ JWT_SECRET properly configured"
    fi
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  ANTHROPIC_API_KEY not set (admin console will not work)"
else
    echo "✅ ANTHROPIC_API_KEY configured"
fi

if [ -z "$AIRTABLE_API_KEY" ]; then
    echo "❌ AIRTABLE_API_KEY not set"
    exit 1
else
    echo "✅ AIRTABLE_API_KEY configured"
fi

# Check for common security misconfigurations
echo ""
echo "⚙️  Checking configuration security..."

if [ "$NODE_ENV" != "production" ]; then
    echo "⚠️  NODE_ENV is not set to 'production'"
else
    echo "✅ NODE_ENV set to production"
fi

# Check file permissions
echo ""
echo "📁 Checking file permissions..."

# Check .env file permissions (should not be world readable)
if [ -f ".env" ]; then
    PERM=$(stat -f "%OLp" .env 2>/dev/null || stat -c "%a" .env 2>/dev/null)
    if [[ "$PERM" =~ ^[0-7][0-7][0-4]$ ]]; then
        echo "✅ .env file permissions are secure"
    else
        echo "⚠️  .env file permissions may be too permissive: $PERM"
    fi
fi

# Check for exposed sensitive files
echo ""
echo "🕵️  Checking for exposed sensitive files..."

SENSITIVE_FILES=(
    ".env"
    ".env.local"
    ".env.production"
    "id_rsa"
    "id_dsa"
    ".ssh/id_rsa"
    "private.key"
    "cert.pem"
    "database.sqlite"
)

for file in "${SENSITIVE_FILES[@]}"; do
    if [ -f "$file" ] && ! grep -q "$file" .gitignore 2>/dev/null; then
        echo "⚠️  Sensitive file '$file' may not be in .gitignore"
    fi
done

# Check TypeScript compilation
echo ""
echo "🔧 Checking TypeScript compilation..."
npm run build > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

# Summary
echo ""
echo "🎉 Security audit completed!"
echo ""
echo "💡 Security Tips:"
echo "   - Run this script regularly (daily in production)"
echo "   - Monitor application logs for security violations"
echo "   - Keep dependencies updated"
echo "   - Review and rotate API keys periodically"
echo "   - Monitor rate limiting and authentication failures"
echo ""
echo "📊 For real-time security monitoring, check application logs for:"
echo "   - [Security Alert] messages"
echo "   - [Auth Security] violations"
echo "   - [Rate Limit] blocks"
echo "   - [Magic Link Security] violations"
