-- =============================================================
-- Fix RLS infinite recursion and insert admin profile
-- =============================================================

-- 1. SECURITY DEFINER function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- 2. Fix Profiles policies (the recursive one)
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

-- 3. Fix Events admin policy
DROP POLICY IF EXISTS "Admins can manage events" ON events;
CREATE POLICY "Admins can manage events"
  ON events FOR ALL
  USING (public.is_admin());

-- 4. Fix Shows admin policy
DROP POLICY IF EXISTS "Admins can manage shows" ON shows;
CREATE POLICY "Admins can manage shows"
  ON shows FOR ALL
  USING (public.is_admin());

-- 5. Fix Seats admin policy
DROP POLICY IF EXISTS "Admins can manage seats" ON seats;
CREATE POLICY "Admins can manage seats"
  ON seats FOR ALL
  USING (public.is_admin());

-- 6. Fix Bookings admin policy
DROP POLICY IF EXISTS "Admins can read all bookings" ON bookings;
CREATE POLICY "Admins can read all bookings"
  ON bookings FOR ALL
  USING (public.is_admin());

-- 7. Fix Booking Seats admin policy
DROP POLICY IF EXISTS "Admins can manage booking seats" ON booking_seats;
CREATE POLICY "Admins can manage booking seats"
  ON booking_seats FOR ALL
  USING (public.is_admin());

-- 8. Fix Tickets admin policy
DROP POLICY IF EXISTS "Admins can manage tickets" ON tickets;
CREATE POLICY "Admins can manage tickets"
  ON tickets FOR ALL
  USING (public.is_admin());

-- 9. Fix Promo Codes admin policy
DROP POLICY IF EXISTS "Admins can manage promo codes" ON promo_codes;
CREATE POLICY "Admins can manage promo codes"
  ON promo_codes FOR ALL
  USING (public.is_admin());

-- 10. Fix Audit Logs admin policy
DROP POLICY IF EXISTS "Admins can read audit logs" ON audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON audit_logs FOR SELECT
  USING (public.is_admin());

-- 11. Insert admin profile (replace with actual admin user id)
INSERT INTO public.profiles (id, full_name, mobile, email, role)
VALUES ('96d6fd35-bd0d-4da5-b6f7-8eefddc854ae', 'Milind Khandare', '9876543210', 'itsmakk@gmail.com', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = EXCLUDED.full_name, mobile = EXCLUDED.mobile, email = EXCLUDED.email;
