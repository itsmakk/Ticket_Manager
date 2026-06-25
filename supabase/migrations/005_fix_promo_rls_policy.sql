-- =============================================================
-- Fix promo codes RLS policy - wrong column name
-- BUG-023: Policy uses 'status = Active' but table has 'is_active' boolean
-- =============================================================

DROP POLICY IF EXISTS "Public can read active promo codes" ON promo_codes;
CREATE POLICY "Public can read active promo codes"
  ON promo_codes FOR SELECT
  USING (is_active = true);
