# Production Deployment Guide

## Prerequisites

1. **External PostgreSQL Database** (recommended)
   - Don't use the Docker PostgreSQL in production
   - Use a managed service like Railway, Supabase, or cloud provider
   - Ensure SSL is enabled

2. **Environment Variables**
   - Copy `.env.production` to `.env.production.local`
   - Fill in all required values
   - Never commit `.env.production.local` to git

## Coolify Deployment Steps

### 1. Prepare Your Repository

```bash
# Run the deployment preparation script
./scripts/deploy.sh
```

### 2. Set Up Coolify Project

1. Create a new project in Coolify
2. Connect your Git repository
3. Choose "Docker Compose" as deployment method
4. Use `docker-compose.production.yml` as your compose file

### 3. Configure Environment Variables

Set these in Coolify's environment section:

**Backend Variables:**
- `NODE_ENV=production`
- `PORT=3001`
- `JWT_SECRET=your-secure-jwt-secret`
- `POSTGRES_HOST=your-db-host`
- `POSTGRES_PORT=5432`
- `POSTGRES_DB=daydream_portal`
- `POSTGRES_USER=your-db-user`
- `POSTGRES_PASSWORD=your-db-password`
- `POSTGRES_SSL=true`
- `AIRTABLE_API_KEY=your-airtable-key`
- `AIRTABLE_BASE_ID=your-base-id`
- `LOOPS_API_KEY=your-loops-key`
- `ANTHROPIC_API_KEY=your-anthropic-key`

**Frontend Variables:**
- `NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api`

### 4. Port Configuration

- **Frontend**: Port 3000 (public)
- **Backend**: Port 3001 (public)  
- **Database**: Port 5432 (internal only)

### 5. Domain Setup

1. Set up domains for both services:
   - Frontend: `app.yourdomain.com`
   - Backend: `api.yourdomain.com`

2. Update `NEXT_PUBLIC_API_URL` to match your backend domain

### 6. Database Setup

**Option A: External Database (Recommended)**
- Use Railway, Supabase, or cloud provider
- Update `POSTGRES_HOST` and credentials
- Remove database service from docker-compose

**Option B: Docker Database (Not Recommended)**
- Keep database service in docker-compose
- Set up persistent volumes
- Configure backups

## Security Checklist

- [ ] JWT_SECRET is cryptographically secure (32+ chars)
- [ ] Database uses SSL connections
- [ ] All API keys are secure and rotated regularly
- [ ] CORS is configured for production domains
- [ ] Rate limiting is enabled
- [ ] Security headers are configured

## Monitoring

- Health checks are configured for all services
- Monitor these endpoints:
  - Frontend: `GET /`
  - Backend: `GET /api/health`
  - Database: Built-in PostgreSQL health check

## Troubleshooting

### Common Issues

1. **Database Connection Fails**
   - Check POSTGRES_* environment variables
   - Verify database allows external connections
   - Check SSL configuration

2. **Frontend Can't Reach Backend**
   - Verify NEXT_PUBLIC_API_URL is correct
   - Check CORS configuration
   - Ensure backend is accessible

3. **Build Failures**
   - Run `./scripts/deploy.sh` locally first
   - Check for TypeScript errors
   - Verify all dependencies are in package.json

### Logs

Check container logs in Coolify:
- Backend logs show database connections and API requests
- Frontend logs show build and runtime issues
- Database logs show connection attempts

## Scaling

For high traffic:
1. Use external managed database
2. Set up Redis for session storage
3. Configure load balancing
4. Implement CDN for static assets
5. Enable gzip compression
