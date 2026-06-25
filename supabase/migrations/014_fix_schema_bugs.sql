-- BUG-022: Fix cancel_booking() audit INSERT using wrong column names (module, record_id instead of entity_type, entity_id)
CREATE OR REPLACE FUNCTION cancel_booking(booking_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE bookings SET status = 'Cancelled' WHERE id = booking_id;
  UPDATE show_seats SET status = 'available', booking_id = NULL WHERE booking_id = cancel_booking.booking_id;
  UPDATE tickets SET status = 'Cancelled' WHERE booking_id = cancel_booking.booking_id;
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'BOOKING_CANCELLED', 'booking', booking_id::TEXT, 'Booking cancelled by admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BUG-023: Fix promo_codes RLS policy referencing non-existent `status` column (table has `is_active` boolean)
DROP POLICY IF EXISTS "Public can read active promo codes" ON promo_codes;
CREATE POLICY "Public can read active promo codes"
  ON promo_codes FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- BUG-024: Fix get_available_seats() referencing non-existent column `row_number` (should be `row_label`)
CREATE OR REPLACE FUNCTION get_available_seats(p_show_id UUID)
RETURNS TABLE (seat_id UUID, seat_number TEXT, row_label TEXT, category TEXT, status TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT ss.id, als.seat_number, als.row_label, als.category, ss.status
  FROM show_seats ss
  JOIN auditorium_seats als ON als.id = ss.auditorium_seat_id
  WHERE ss.show_id = p_show_id
  ORDER BY als.row_label, als.seat_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BUG-025: Fix retention cleanup being blocked by append-only trigger
-- Modify the trigger to allow DELETE from the SECURITY DEFINER cleanup function
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('app.audit_cleanup', true) = 'true' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'audit_logs are append-only: UPDATE and DELETE are not permitted';
END;
$$ LANGUAGE plpgsql;

-- Updated cleanup function that sets the app.audit_cleanup flag
CREATE OR REPLACE FUNCTION cleanup_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  PERFORM set_config('app.audit_cleanup', 'true', false);
  DELETE FROM audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  PERFORM set_config('app.audit_cleanup', 'false', false);
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BUG-037: Fix infinite RLS recursion in profiles admin policy
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

-- BUG-009: Add admin RLS policy for payment_intents
DROP POLICY IF EXISTS "Admins can manage payment intents" ON payment_intents;
CREATE POLICY "Admins can manage payment intents"
  ON payment_intents FOR ALL
  USING (public.is_admin());

-- BUG-015: Fix maintenance_mode admin policy to use public.is_admin() consistently
DROP POLICY IF EXISTS "Admins can update maintenance mode" ON maintenance_mode;
CREATE POLICY "Admins can update maintenance mode"
  ON maintenance_mode FOR ALL
  USING (public.is_admin());
