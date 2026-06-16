-- BUG-010: Atomic promo usage check + payment_intent for complimentary bookings

-- Replace increment_promo_usage with atomic version that returns FALSE
-- when the usage limit has been reached, preventing concurrent over-use.
CREATE OR REPLACE FUNCTION increment_promo_usage(promo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE promo_codes
  SET used_count = used_count + 1
  WHERE id = promo_id
    AND (max_uses IS NULL OR used_count < max_uses);
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
