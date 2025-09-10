-- Migration to add '2-day' option to event_format_type enum
-- Run this in your PostgreSQL database before deploying the code changes

BEGIN;

-- Add '2-day' to the existing enum
ALTER TYPE event_format_type ADD VALUE '2-day';

-- Commit the transaction
COMMIT;

-- Verify the enum values
SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'event_format_type');
