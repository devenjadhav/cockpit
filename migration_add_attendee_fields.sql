-- Migration: Add additional attendee fields
-- Add new fields to the attendees table for better attendee management

ALTER TABLE attendees 
ADD COLUMN IF NOT EXISTS shirt_size VARCHAR(20),
ADD COLUMN IF NOT EXISTS additional_accommodations TEXT,
ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_1_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS emergency_contact_1_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS checkin_completed BOOLEAN DEFAULT FALSE;

-- Update the production setup file as well
-- These fields will be included in the production-db-setup.sql
