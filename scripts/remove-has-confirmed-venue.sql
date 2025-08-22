-- Migration to remove has_confirmed_venue column from events table
-- Run this manually: docker exec daydream-postgres psql -U daydream_user -d daydream_portal -f /path/to/this/file.sql

ALTER TABLE events DROP COLUMN IF EXISTS has_confirmed_venue;
