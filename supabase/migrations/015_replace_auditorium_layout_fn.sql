-- Separate the reusable physical auditorium layout from per-show allocation
-- state. Existing show-seat UUIDs are preserved so bookings and locks remain
-- linked to the same allocation records.
ALTER TABLE seats RENAME TO show_seats;

CREATE TABLE IF NOT EXISTS auditorium_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_number TEXT NOT NULL UNIQUE,
  row_label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'silver',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE auditorium_seats ENABLE ROW LEVEL SECURITY;

INSERT INTO auditorium_seats (seat_number, row_label, category)
SELECT DISTINCT ON (seat_number)
  seat_number,
  COALESCE(row_label, LEFT(seat_number, 1)),
  category
FROM show_seats
ORDER BY seat_number, created_at;

ALTER TABLE show_seats
  ADD COLUMN IF NOT EXISTS auditorium_seat_id UUID REFERENCES auditorium_seats(id) ON DELETE RESTRICT;

UPDATE show_seats ss
SET auditorium_seat_id = aus.id
FROM auditorium_seats aus
WHERE ss.auditorium_seat_id IS NULL
  AND aus.seat_number = ss.seat_number;

ALTER TABLE show_seats
  ALTER COLUMN auditorium_seat_id SET NOT NULL;

ALTER TABLE show_seats
  ADD CONSTRAINT show_seats_show_auditorium_seat_key
  UNIQUE (show_id, auditorium_seat_id);

ALTER TABLE show_seats
  DROP COLUMN seat_number,
  DROP COLUMN row_label,
  DROP COLUMN category;

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS show_seat_id UUID REFERENCES show_seats(id) ON DELETE RESTRICT;

DROP POLICY IF EXISTS "Public can read seats" ON show_seats;
CREATE POLICY "Public can read show seats"
  ON show_seats FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage seats" ON show_seats;
CREATE POLICY "Admins can manage show seats"
  ON show_seats FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Public can read auditorium seats" ON auditorium_seats;
CREATE POLICY "Public can read auditorium seats"
  ON auditorium_seats FOR SELECT
  USING (is_active);

DROP POLICY IF EXISTS "Admins can manage auditorium seats" ON auditorium_seats;
CREATE POLICY "Admins can manage auditorium seats"
  ON auditorium_seats FOR ALL
  USING (public.is_admin());

DROP TRIGGER IF EXISTS trg_auditorium_seats_updated_at ON auditorium_seats;
CREATE TRIGGER trg_auditorium_seats_updated_at
  BEFORE UPDATE ON auditorium_seats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION seed_show_seats_from_auditorium()
RETURNS TRIGGER AS $$
DECLARE
  allocation_count INTEGER;
BEGIN
  INSERT INTO show_seats (show_id, auditorium_seat_id, status)
  SELECT NEW.id, id, 'available'
  FROM auditorium_seats
  WHERE is_active;

  GET DIAGNOSTICS allocation_count = ROW_COUNT;
  IF allocation_count = 0 THEN
    RAISE EXCEPTION 'Configure the auditorium seating layout before creating shows';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seed_show_seats ON shows;
CREATE TRIGGER trg_seed_show_seats
  AFTER INSERT ON shows
  FOR EACH ROW EXECUTE FUNCTION seed_show_seats_from_auditorium();

CREATE OR REPLACE FUNCTION replace_auditorium_layout(p_layout JSONB)
RETURNS INTEGER AS $$
DECLARE
  seat_count INTEGER;
BEGIN
  IF jsonb_typeof(p_layout) <> 'array' OR jsonb_array_length(p_layout) = 0 THEN
    RAISE EXCEPTION 'Layout must contain at least one seat';
  END IF;

  IF EXISTS (SELECT 1 FROM bookings)
    OR EXISTS (SELECT 1 FROM seat_locks)
    OR EXISTS (
      SELECT 1
      FROM payment_intents
      WHERE status IN ('PENDING', 'PROCESSING', 'REFUND_PENDING')
    )
  THEN
    RAISE EXCEPTION 'The auditorium layout cannot be replaced after bookings, locks, or active payments exist';
  END IF;

  DELETE FROM show_seats;
  DELETE FROM auditorium_seats;

  INSERT INTO auditorium_seats (seat_number, row_label, category, is_active)
  SELECT seat_number, row_label, category, COALESCE(is_active, true)
  FROM jsonb_to_recordset(p_layout) AS layout(
    seat_number TEXT,
    row_label TEXT,
    category TEXT,
    is_active BOOLEAN
  );

  GET DIAGNOSTICS seat_count = ROW_COUNT;

  INSERT INTO show_seats (show_id, auditorium_seat_id, status)
  SELECT shows.id, auditorium_seats.id, 'available'
  FROM shows
  CROSS JOIN auditorium_seats
  WHERE auditorium_seats.is_active;

  RETURN seat_count;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION replace_auditorium_layout(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION replace_auditorium_layout(JSONB) TO service_role;

CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS VOID AS $$
BEGIN
  UPDATE show_seats ss
  SET status = 'available', locked_at = NULL, updated_at = NOW()
  WHERE ss.status = 'locked'
    AND ss.booking_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM seat_locks sl
      WHERE sl.seat_id = ss.id
        AND sl.expires_at < NOW()
    );

  DELETE FROM seat_locks WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_available_seats(UUID);
CREATE FUNCTION get_available_seats(p_show_id UUID)
RETURNS TABLE (seat_id UUID, seat_number TEXT, row_label TEXT, category TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT ss.id, aus.seat_number, aus.row_label, aus.category
  FROM show_seats ss
  JOIN auditorium_seats aus ON aus.id = ss.auditorium_seat_id
  WHERE ss.show_id = p_show_id
    AND aus.is_active
    AND ss.status = 'available'
    AND NOT EXISTS (
      SELECT 1
      FROM seat_locks sl
      WHERE sl.seat_id = ss.id
        AND sl.show_id = p_show_id
        AND sl.expires_at > NOW()
    )
  ORDER BY aus.row_label, aus.seat_number;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION cancel_booking(booking_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE bookings
  SET status = 'Cancelled', updated_at = NOW()
  WHERE id = booking_id AND status = 'Confirmed';

  UPDATE show_seats ss
  SET status = 'available', booking_id = NULL, updated_at = NOW()
  FROM booking_seats bs
  WHERE bs.booking_id = cancel_booking.booking_id
    AND bs.seat_id = ss.id;

  UPDATE tickets
  SET status = 'Cancelled'
  WHERE tickets.booking_id = cancel_booking.booking_id;

  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'BOOKING_CANCELLED', 'booking', booking_id::TEXT, 'Booking cancelled by admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
