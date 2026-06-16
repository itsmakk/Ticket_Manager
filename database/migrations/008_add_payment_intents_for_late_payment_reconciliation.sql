-- Persist the server-calculated Razorpay order context so successful payments
-- can be reconciled even when the original five-minute seat lock has expired.
CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_order_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE RESTRICT,
  seat_ids UUID[] NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
  lock_expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSING', 'BOOKED', 'REFUND_PENDING', 'REFUNDED', 'RECONCILIATION_REQUIRED')),
  payment_id TEXT UNIQUE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  refund_id TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id ON payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);

ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own payment intents" ON payment_intents;
CREATE POLICY "Users can read own payment intents"
  ON payment_intents FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP TRIGGER IF EXISTS trg_payment_intents_updated_at ON payment_intents;
CREATE TRIGGER trg_payment_intents_updated_at
  BEFORE UPDATE ON payment_intents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
