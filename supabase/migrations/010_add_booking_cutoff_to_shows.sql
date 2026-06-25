-- BUG-007: Add booking cutoff to shows table
-- Prevents booking when within N minutes of show start time

ALTER TABLE shows
ADD COLUMN booking_cutoff_minutes INTEGER NOT NULL DEFAULT 30;

COMMENT ON COLUMN shows.booking_cutoff_minutes IS
  'Number of minutes before show start_time when booking is no longer allowed. Default 30.';
