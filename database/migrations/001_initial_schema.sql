-- =============================================================
-- CSM Auditorium - Ticket Booking System
-- Initial Database Schema
-- Run this in Supabase SQL Editor
-- =============================================================

-- 1. PROFILES TABLE (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  mobile TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'counter', 'scanner', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, mobile, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'mobile',
    NEW.email,
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. EVENTS TABLE
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Movie',
  poster_url TEXT,
  banner_url TEXT,
  trailer_url TEXT,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published', 'Archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 3. SHOWS TABLE
CREATE TABLE IF NOT EXISTS shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  show_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration INTEGER DEFAULT 120,
  end_time TIME,
  status TEXT NOT NULL DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'Active', 'Completed', 'Cancelled')),
  price_premium DECIMAL(10,2) DEFAULT 300,
  price_gold DECIMAL(10,2) DEFAULT 250,
  price_silver DECIMAL(10,2) DEFAULT 200,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shows ENABLE ROW LEVEL SECURITY;

-- Auto-calculate end_time
CREATE OR REPLACE FUNCTION calc_end_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.end_time = (NEW.start_time::TIME + (NEW.duration || ' minutes')::INTERVAL)::TIME;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_end_time ON shows;
CREATE TRIGGER trg_calc_end_time
  BEFORE INSERT OR UPDATE ON shows
  FOR EACH ROW EXECUTE FUNCTION calc_end_time();

-- 4. SEATS TABLE
CREATE TABLE IF NOT EXISTS seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  seat_number TEXT NOT NULL,
  row_label TEXT,
  category TEXT NOT NULL DEFAULT 'silver',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'locked', 'booked', 'blocked')),
  locked_at TIMESTAMPTZ,
  booking_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(show_id, seat_number)
);

ALTER TABLE seats ENABLE ROW LEVEL SECURITY;

-- 5. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_id UUID NOT NULL REFERENCES events(id),
  show_id UUID NOT NULL REFERENCES shows(id),
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Confirmed' CHECK (status IN ('Confirmed', 'Cancelled')),
  booking_source TEXT NOT NULL DEFAULT 'USER' CHECK (booking_source IN ('USER', 'COUNTER', 'ADMIN_COUNTER')),
  payment_status TEXT DEFAULT 'PAID' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED')),
  payment_mode TEXT DEFAULT 'ONLINE' CHECK (payment_mode IN ('ONLINE', 'CASH', 'UPI')),
  payment_id TEXT,
  razorpay_order_id TEXT,
  promo_code_id UUID,
  customer_name TEXT,
  customer_mobile TEXT,
  customer_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 6. BOOKING_SEATS (junction table)
CREATE TABLE IF NOT EXISTS booking_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  seat_id UUID NOT NULL REFERENCES seats(id),
  seat_number TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seat_id, booking_id)
);

ALTER TABLE booking_seats ENABLE ROW LEVEL SECURITY;

-- 7. TICKETS TABLE
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  ticket_id TEXT NOT NULL UNIQUE,
  verification_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Valid' CHECK (status IN ('Valid', 'Used', 'Cancelled', 'Expired')),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- 8. PROMO_CODES TABLE
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('FIXED', 'PERCENTAGE', 'COMPLIMENTARY')),
  discount_value DECIMAL(10,2) DEFAULT 0,
  max_uses INTEGER DEFAULT 100,
  used_count INTEGER DEFAULT 0,
  max_discount_amount DECIMAL(10,2),
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- 9. AUDIT_LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 10. SEAT_LOCKS (for temporary locking during booking)
CREATE TABLE IF NOT EXISTS seat_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id UUID NOT NULL REFERENCES seats(id),
  show_id UUID NOT NULL REFERENCES shows(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(seat_id, show_id)
);

ALTER TABLE seat_locks ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================

-- Profiles: users can read own, admins can read all
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Events: public can read published, admins can CRUD
DROP POLICY IF EXISTS "Public can read published events" ON events;
CREATE POLICY "Public can read published events"
  ON events FOR SELECT
  USING (status = 'Published');

DROP POLICY IF EXISTS "Admins can manage events" ON events;
CREATE POLICY "Admins can manage events"
  ON events FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Shows: public can read non-cancelled, admins CRUD
DROP POLICY IF EXISTS "Public can read active shows" ON shows;
CREATE POLICY "Public can read active shows"
  ON shows FOR SELECT
  USING (status IN ('Upcoming', 'Active', 'Completed'));

DROP POLICY IF EXISTS "Admins can manage shows" ON shows;
CREATE POLICY "Admins can manage shows"
  ON shows FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seats: public can read, admins CRUD
DROP POLICY IF EXISTS "Public can read seats" ON seats;
CREATE POLICY "Public can read seats"
  ON seats FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage seats" ON seats;
CREATE POLICY "Admins can manage seats"
  ON seats FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Bookings: users can read own, admins all
DROP POLICY IF EXISTS "Users can read own bookings" ON bookings;
CREATE POLICY "Users can read own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all bookings" ON bookings;
CREATE POLICY "Admins can read all bookings"
  ON bookings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Booking seats: users can read own, admins all
DROP POLICY IF EXISTS "Users can read own booking seats" ON booking_seats;
CREATE POLICY "Users can read own booking seats"
  ON booking_seats FOR SELECT
  USING (EXISTS (SELECT 1 FROM bookings WHERE id = booking_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage booking seats" ON booking_seats;
CREATE POLICY "Admins can manage booking seats"
  ON booking_seats FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Tickets: users can read own, admins all
DROP POLICY IF EXISTS "Users can read own tickets" ON tickets;
CREATE POLICY "Users can read own tickets"
  ON tickets FOR SELECT
  USING (EXISTS (SELECT 1 FROM bookings WHERE id = booking_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage tickets" ON tickets;
CREATE POLICY "Admins can manage tickets"
  ON tickets FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Promo codes: public can read active for validation
DROP POLICY IF EXISTS "Public can read active promo codes" ON promo_codes;
CREATE POLICY "Public can read active promo codes"
  ON promo_codes FOR SELECT
  USING (status = 'Active');

DROP POLICY IF EXISTS "Admins can manage promo codes" ON promo_codes;
CREATE POLICY "Admins can manage promo codes"
  ON promo_codes FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Audit logs: admins only
DROP POLICY IF EXISTS "Admins can read audit logs" ON audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Seat locks: users can read/insert/delete own
DROP POLICY IF EXISTS "Users can manage own locks" ON seat_locks;
CREATE POLICY "Users can manage own locks"
  ON seat_locks FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Check locks for all" ON seat_locks;
CREATE POLICY "Check locks for all"
  ON seat_locks FOR SELECT
  USING (true);

-- =============================================================
-- FUNCTIONS & STORED PROCEDURES
-- =============================================================

-- Function: cancel booking (admin only)
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

  -- Audit log
  INSERT INTO audit_logs (user_id, action, module, record_id, details)
  VALUES (auth.uid(), 'Booking Cancelled', 'Booking', booking_id::TEXT, 'Booking cancelled by admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: cleanup expired seat locks
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS VOID AS $$
BEGIN
  DELETE FROM seat_locks WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function: daily revenue report
CREATE OR REPLACE FUNCTION daily_revenue_report()
RETURNS TABLE (date DATE, booking_count BIGINT, total_revenue DECIMAL, online_revenue DECIMAL, counter_revenue DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.created_at::DATE,
    COUNT(*)::BIGINT,
    COALESCE(SUM(b.total_amount), 0),
    COALESCE(SUM(CASE WHEN b.booking_source = 'USER' THEN b.total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN b.booking_source = 'ADMIN_COUNTER' THEN b.total_amount ELSE 0 END), 0)
  FROM bookings b
  WHERE b.status = 'Confirmed'
  GROUP BY b.created_at::DATE
  ORDER BY b.created_at::DATE DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: monthly revenue report
CREATE OR REPLACE FUNCTION monthly_revenue_report()
RETURNS TABLE (month TEXT, total_revenue DECIMAL, total_bookings BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(b.created_at, 'YYYY-MM'),
    COALESCE(SUM(b.total_amount), 0),
    COUNT(*)::BIGINT
  FROM bookings b
  WHERE b.status = 'Confirmed'
  GROUP BY TO_CHAR(b.created_at, 'YYYY-MM')
  ORDER BY TO_CHAR(b.created_at, 'YYYY-MM') DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: promo code report
CREATE OR REPLACE FUNCTION promo_code_report()
RETURNS TABLE (code TEXT, usage_count BIGINT, total_discount DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.code,
    COUNT(*)::BIGINT,
    COALESCE(SUM(b.discount_amount), 0)
  FROM promo_codes pc
  LEFT JOIN bookings b ON b.promo_code_id = pc.id AND b.status = 'Confirmed'
  GROUP BY pc.code
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_shows_updated_at BEFORE UPDATE ON shows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_seats_updated_at BEFORE UPDATE ON seats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_promos_updated_at BEFORE UPDATE ON promo_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Schedule lock cleanup every minute (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-locks', '* * * * *', 'SELECT cleanup_expired_locks();');

-- =============================================================
-- SEED DATA: Default admin user (run AFTER creating admin in Supabase Auth)
-- Insert a profile for the first admin user manually:
-- INSERT INTO profiles (id, full_name, mobile, email, role)
-- VALUES ('USER_ID_HERE', 'Admin', '9876543210', 'admin@auditorium.com', 'admin');

-- Sample seats (can be customized via admin UI)
-- INSERT INTO seats (seat_number, row_number, category, status) VALUES
-- ('A1', 'A', 'premium', 'available'),
-- ('A2', 'A', 'premium', 'available');
-- (Use admin panel to generate full layout)
