-- =============================================================
-- Fix cancel_booking() function - wrong audit log column names
-- BUG-022: INSERT uses 'module, record_id' but table has 'entity_type, entity_id'
-- =============================================================

CREATE OR REPLACE FUNCTION cancel_booking(booking_id UUID)
RETURNS VOID AS $$
DECLARE
  v_seat_id UUID;
BEGIN
  -- Update booking status
  UPDATE bookings SET status = 'Cancelled', updated_at = NOW()
  WHERE id = booking_id AND status = 'Confirmed';

  -- Release seats
  FOR v_seat_id IN
    SELECT seat_id FROM booking_seats WHERE booking_id = cancel_booking.booking_id
  LOOP
    UPDATE seats SET status = 'available', updated_at = NOW()
    WHERE id = v_seat_id;
  END LOOP;

  -- Mark tickets as cancelled
  UPDATE tickets SET status = 'Cancelled'
  WHERE booking_id = cancel_booking.booking_id;

  -- Audit log (fixed: module→entity_type, record_id→entity_id)
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'Booking Cancelled', 'Booking', booking_id::TEXT, 'Booking cancelled by admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
