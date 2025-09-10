-- Migration to add 'event_volunteer' boolean field to attendees table
-- Run this in your PostgreSQL database before deploying the code changes

BEGIN;

-- Add event_volunteer boolean field with default false
ALTER TABLE attendees 
ADD COLUMN event_volunteer BOOLEAN DEFAULT FALSE;

-- Commit the transaction
COMMIT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'attendees' AND column_name = 'event_volunteer';
