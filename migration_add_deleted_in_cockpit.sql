-- Migration: Add deleted_in_cockpit field to attendees table
-- This field tracks soft deletes from the cockpit interface

-- Add the deleted_in_cockpit column to the attendees table
ALTER TABLE attendees 
ADD COLUMN IF NOT EXISTS deleted_in_cockpit BOOLEAN DEFAULT FALSE;

-- Create index for performance when filtering deleted attendees
CREATE INDEX IF NOT EXISTS idx_attendees_deleted_in_cockpit ON attendees(deleted_in_cockpit);

-- Update the attendees query to exclude soft deleted attendees by default
COMMENT ON COLUMN attendees.deleted_in_cockpit IS 'Soft delete flag set when attendee is removed via cockpit interface';
