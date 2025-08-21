# Database Migrations

This document explains the automated database migration system for the Daydream Portal application.

## Overview

The application now includes an automated database migration system that ensures the database schema is always up-to-date during deployments. The system is designed to be:

- **Idempotent**: Can be run multiple times safely without side effects
- **Zero-downtime**: Migrations run during application startup
- **Consistent**: Ensures all environments have the same database structure
- **Safe**: Handles existing data and prevents data loss

## How It Works

### 1. Migration Script (`scripts/migrate-db.js`)

The core migration script performs the following operations:

1. **Extensions**: Creates required PostgreSQL extensions (`uuid-ossp`, `pg_stat_statements`)
2. **Enum Types**: Creates custom enum types for the application
3. **Tables**: Creates all required tables with proper structure
4. **Columns**: Adds any missing columns to existing tables
5. **Indexes**: Creates performance indexes on frequently queried columns
6. **Constraints**: Adds unique constraints and foreign key relationships
7. **Triggers**: Sets up automatic `updated_at` timestamp triggers
8. **Users**: Creates read-only database users for admin console
9. **Sync Metadata**: Initializes sync tracking for Airtable integration
10. **Data Cleanup**: Removes inconsistencies and duplicate records

### 2. Deployment Integration

#### Docker Deployment
- The `Dockerfile` includes the migration script and startup script
- `scripts/start-with-migration.sh` runs migrations before starting the server
- Database health checks ensure migrations don't start until DB is ready

#### Manual Deployment
- Run `npm run migrate` to execute migrations manually
- Run `npm run pre-deploy` to run migrations + build
- Run `npm run deploy` for full deployment process

### 3. Available Commands

```bash
# Run database migrations
npm run migrate

# Run migrations + build application
npm run pre-deploy

# Full deployment (migrate + build + start)
npm run deploy
```

## Database Schema

### Tables Created/Maintained

1. **events** - Event information from Airtable
   - Includes all event details, POC info, location, triage status
   - Auto-generates UUID primary keys
   - Tracks sync timestamps

2. **admins** - Admin user information
   - User details and permission levels
   - Email-based authentication support

3. **attendees** - Event attendee information
   - Links to events via foreign key
   - Stores registration details and contact info

4. **sync_metadata** - Airtable sync tracking
   - Tracks sync operations and status
   - Maintains error logs and statistics

### Key Features

- **UUID Primary Keys**: All tables use UUID for better scalability
- **Timestamps**: Automatic `created_at`, `updated_at`, and `synced_at` tracking  
- **Foreign Keys**: Proper relationships with cascading deletes
- **Indexes**: Performance-optimized for common queries
- **Constraints**: Data integrity with unique constraints

## Environment Variables

The migration script uses the following environment variables:

```bash
POSTGRES_HOST=localhost          # Database host
POSTGRES_PORT=5432              # Database port  
POSTGRES_DB=daydream_portal     # Database name
POSTGRES_USER=daydream_user     # Database user
POSTGRES_PASSWORD=<password>    # Database password
POSTGRES_SSL=false              # SSL connection (true/false)
```

## Error Handling

The migration system includes comprehensive error handling:

- **Connection Failures**: Graceful error messages for database connection issues
- **Constraint Conflicts**: Safely handles existing constraints and indexes
- **Data Integrity**: Preserves existing data during schema changes
- **Rollback Safety**: Migrations are designed to be non-destructive

## Deployment Scenarios

### 1. Fresh Deployment
- Creates complete database schema from scratch
- Sets up all tables, indexes, and constraints
- Initializes sync metadata

### 2. Existing Database
- Detects existing schema and adds missing components
- Updates constraints and indexes as needed
- Preserves all existing data

### 3. Schema Updates
- Adds new columns, tables, or constraints
- Maintains backward compatibility
- Updates existing records safely

## Production Considerations

### Health Checks
- Database connectivity verified before migrations
- Application starts only after successful migration
- Health endpoints confirm system readiness

### Logging
- Detailed migration logs for debugging
- Success/failure status reporting
- Performance timing information

### Monitoring
- Sync metadata tracks operation status
- Error details stored for analysis
- Migration history maintained

## Troubleshooting

### Common Issues

1. **Database Connection Timeout**
   ```bash
   # Check database status
   docker exec daydream-postgres pg_isready -U daydream_user -d daydream_portal
   ```

2. **Permission Errors**
   ```bash
   # Verify environment variables
   echo $POSTGRES_PASSWORD
   ```

3. **Constraint Conflicts**
   - Migration script handles existing constraints safely
   - Check logs for specific error details

### Manual Recovery

If migrations fail, you can:

1. **Check Database Status**:
   ```bash
   npm run migrate
   ```

2. **View Migration Logs**:
   ```bash
   docker logs daydream-backend
   ```

3. **Reset Sync Metadata** (if needed):
   ```sql
   DELETE FROM sync_metadata;
   ```

## Future Enhancements

- **Version Tracking**: Add migration version numbers
- **Rollback Support**: Add migration rollback capabilities  
- **Schema Validation**: Compare expected vs actual schema
- **Performance Metrics**: Track migration execution time
- **Automated Testing**: Unit tests for migration logic

---

For questions or issues with the migration system, check the logs or run migrations manually with `npm run migrate`.
