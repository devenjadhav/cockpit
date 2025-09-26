-- Migration to add scanned_in field to attendees table
-- This adds a boolean field to track whether an attendee has been scanned in

ALTER TABLE attendees 
ADD COLUMN scanned_in BOOLEAN DEFAULT FALSE;

-- Add index for performance if needed
CREATE INDEX IF NOT EXISTS idx_attendees_scanned_in ON attendees(scanned_in);

-- Comment for documentation
COMMENT ON COLUMN attendees.scanned_in IS 'Boolean flag indicating whether the attendee has been scanned in';
