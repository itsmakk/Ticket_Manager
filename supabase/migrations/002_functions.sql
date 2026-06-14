-- Additional functions for the booking system

-- Increment promo code usage count
CREATE OR REPLACE FUNCTION increment_promo_usage(promo_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE promo_codes
  SET usage_count = usage_count + 1
  WHERE id = promo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get available seats for a show
CREATE OR REPLACE FUNCTION get_available_seats(show_id UUID)
RETURNS TABLE (seat_id UUID, seat_number TEXT, row_number TEXT, category TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.seat_number, s.row_number, s.category
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
  ORDER BY s.row_number, s.seat_number;
END;
$$ LANGUAGE plpgsql STABLE;
