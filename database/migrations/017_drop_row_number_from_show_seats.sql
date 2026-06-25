-- Fix: Drop unexpected `row_number` column from show_seats.
-- The schema uses `row_label` (now in auditorium_seats), not `row_number`.
-- This column was never defined in migrations but may exist in some databases,
-- causing NOT NULL violations when seed_show_seats_from_auditorium() inserts rows.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'show_seats' AND column_name = 'row_number'
  ) THEN
    ALTER TABLE show_seats DROP COLUMN row_number;
  END IF;
END $$;
