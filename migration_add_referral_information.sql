-- Migration to add referral_information field to attendees table
-- Run this against your database to add the new field

ALTER TABLE attendees 
ADD COLUMN IF NOT EXISTS referral_information TEXT;

-- Update the updated_at timestamp trigger if it exists
-- This ensures the field is properly tracked for changes
UPDATE attendees SET updated_at = NOW() WHERE referral_information IS NOT NULL;
