-- Production Database Setup for Daydream Portal
-- This script handles cases where tables might already exist
-- Run these commands in your production PostgreSQL database

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create enum types (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_format_type') THEN
        CREATE TYPE event_format_type AS ENUM ('12-hours', '24-hours', '2-day');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'triage_status_type') THEN
        CREATE TYPE triage_status_type AS ENUM ('approved', 'rejected', 'hold', 'ask', 'pending', 'denied', 'merge_confirmed');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status_type') THEN
        CREATE TYPE user_status_type AS ENUM ('active', 'admin', 'inactive');
    END IF;
END$$;

-- Events table (mirrors Airtable events)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    airtable_id VARCHAR(255) UNIQUE NOT NULL,
    event_name VARCHAR(500) NOT NULL,
    poc_first_name VARCHAR(255),
    poc_last_name VARCHAR(255),
    poc_preferred_name VARCHAR(255),
    poc_slack_id VARCHAR(255),
    poc_dob DATE,
    poc_age INTEGER,
    email VARCHAR(500) NOT NULL,
    location VARCHAR(500),
    slug VARCHAR(255),
    street_address VARCHAR(500),
    street_address_2 VARCHAR(500),
    city VARCHAR(255),
    state VARCHAR(255),
    country VARCHAR(255),
    zipcode VARCHAR(20),
    event_format event_format_type,
    sub_organizers TEXT,
    estimated_attendee_count INTEGER,
    project_url TEXT,
    project_description TEXT,
    lat DECIMAL(10, 8),
    long DECIMAL(11, 8),
    triage_status triage_status_type DEFAULT 'pending',
    start_date DATE,
    end_date DATE,
    registration_deadline DATE,
    notes TEXT,
    action_trigger_approval_email VARCHAR(500),
    action_trigger_rejection_email VARCHAR(500),
    action_trigger_hold_email VARCHAR(500),
    action_trigger_ask_email VARCHAR(500),
    has_confirmed_venue BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admins table (mirrors Airtable admins)
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    airtable_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(500) UNIQUE NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    user_status user_status_type DEFAULT 'inactive',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendees table (mirrors Airtable attendees) - IMPORTANT: This might be missing from existing setups
CREATE TABLE IF NOT EXISTS attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    airtable_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(500) NOT NULL,
    preferred_name VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    dob DATE,
    phone VARCHAR(50),
    event_airtable_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'attendees_event_airtable_id_fkey'
    ) THEN
        ALTER TABLE attendees 
        ADD CONSTRAINT attendees_event_airtable_id_fkey 
        FOREIGN KEY (event_airtable_id) REFERENCES events(airtable_id) ON DELETE CASCADE;
    END IF;
END$$;

-- Sync metadata table for tracking sync operations
CREATE TABLE IF NOT EXISTS sync_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL UNIQUE,
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync_status VARCHAR(50) DEFAULT 'success',
    records_synced INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    error_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Slack sync metadata table
CREATE TABLE IF NOT EXISTS slack_sync_metadata (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL DEFAULT 'slack_channel_sync',
    channels_synced JSONB,
    members_added INTEGER DEFAULT 0,
    last_sync_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_sync_status VARCHAR(20) CHECK (last_sync_status IN ('success', 'failure', 'partial')),
    errors_count INTEGER DEFAULT 0,
    error_details TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_events_email ON events(email);
CREATE INDEX IF NOT EXISTS idx_events_triage_status ON events(triage_status);
CREATE INDEX IF NOT EXISTS idx_events_location ON events(location);
CREATE INDEX IF NOT EXISTS idx_events_event_format ON events(event_format);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_airtable_id ON events(airtable_id);
CREATE INDEX IF NOT EXISTS idx_events_synced_at ON events(synced_at);

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_user_status ON admins(user_status);
CREATE INDEX IF NOT EXISTS idx_admins_airtable_id ON admins(airtable_id);

CREATE INDEX IF NOT EXISTS idx_attendees_email ON attendees(email);
CREATE INDEX IF NOT EXISTS idx_attendees_event_airtable_id ON attendees(event_airtable_id);
CREATE INDEX IF NOT EXISTS idx_attendees_airtable_id ON attendees(airtable_id);
CREATE INDEX IF NOT EXISTS idx_attendees_synced_at ON attendees(synced_at);

CREATE INDEX IF NOT EXISTS idx_sync_metadata_table_name ON sync_metadata(table_name);
CREATE INDEX IF NOT EXISTS idx_sync_metadata_last_sync_at ON sync_metadata(last_sync_at);

CREATE INDEX IF NOT EXISTS idx_slack_sync_metadata_last_sync_at ON slack_sync_metadata(last_sync_at);
CREATE INDEX IF NOT EXISTS idx_slack_sync_metadata_sync_type ON slack_sync_metadata(sync_type);

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at (drop and recreate to ensure consistency)
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admins_updated_at ON admins;
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendees_updated_at ON attendees;
CREATE TRIGGER update_attendees_updated_at BEFORE UPDATE ON attendees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Clean up duplicate entries in sync_metadata table and add unique constraint
DO $$
BEGIN
    -- Check if sync_metadata table exists and has data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_metadata') THEN
        
        -- Remove duplicate entries, keeping only the most recent one for each table_name
        DELETE FROM sync_metadata 
        WHERE id NOT IN (
            SELECT DISTINCT ON (table_name) id 
            FROM sync_metadata 
            ORDER BY table_name, created_at DESC
        );
        
        -- Add unique constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'sync_metadata_table_name_key'
            AND table_name = 'sync_metadata'
        ) THEN
            ALTER TABLE sync_metadata ADD CONSTRAINT sync_metadata_table_name_key UNIQUE (table_name);
        END IF;
    END IF;
END$$;

-- Insert initial sync metadata (with conflict handling)
-- Use a more robust approach that doesn't rely on unique constraint
INSERT INTO sync_metadata (table_name, last_sync_status, records_synced) 
SELECT table_name, 'pending', 0 
FROM (VALUES ('events'), ('admins'), ('attendees')) AS t(table_name)
WHERE NOT EXISTS (
    SELECT 1 FROM sync_metadata sm WHERE sm.table_name = t.table_name
);

-- Create read-only user for admin console queries (handle existing user)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'readonly_user') THEN
        CREATE USER readonly_user WITH PASSWORD 'readonly_secure_pass_change_me';
    END IF;
END$$;

-- Grant permissions (these are safe to run multiple times)
GRANT CONNECT ON DATABASE postgres TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_user;

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE 'Database schema setup completed successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update readonly_user password: ALTER USER readonly_user WITH PASSWORD ''your_secure_password'';';
    RAISE NOTICE '2. Run your sync service to populate data from Airtable';
    RAISE NOTICE '3. Verify all tables exist: \dt';
END$$;
