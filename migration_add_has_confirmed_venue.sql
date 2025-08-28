-- Migration: Add has_confirmed_venue column to events table
-- Date: 2025-01-28
-- Description: Add missing has_confirmed_venue column that exists in setup-db.sql but missing from production

ALTER TABLE events ADD COLUMN IF NOT EXISTS has_confirmed_venue BOOLEAN DEFAULT FALSE;

-- Update index if needed (optional optimization)
CREATE INDEX IF NOT EXISTS idx_events_has_confirmed_venue ON events(has_confirmed_venue);
