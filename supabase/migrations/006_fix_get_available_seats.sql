-- =============================================================
-- Fix get_available_seats() - wrong column name
-- BUG-024: Function references 'row_number' but table has 'row_label'
-- =============================================================

CREATE OR REPLACE FUNCTION get_available_seats(show_id UUID)
RETURNS TABLE (seat_id UUID, seat_number TEXT, row_label TEXT, category TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.seat_number, s.row_label, s.category
  FROM seats s
  WHERE s.status = 'available'
    AND s.id NOT IN (
      SELECT bs.seat_id FROM booking_seats bs
      JOIN bookings b ON b.id = bs.booking_id
      WHERE b.show_id = get_available_seats.show_id
        AND b.status = 'Confirmed'
    )
    AND s.id NOT IN (
      SELECT sl.seat_id FROM seat_locks sl
      WHERE sl.show_id = get_available_seats.show_id
        AND sl.expires_at > NOW()
    )
  ORDER BY s.row_label, s.seat_number;
END;
$$ LANGUAGE plpgsql STABLE;
