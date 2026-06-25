-- BUG-012: Maintenance mode configuration

CREATE TABLE IF NOT EXISTS maintenance_mode (
  id INTEGER PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT false,
  message TEXT DEFAULT 'System is under maintenance. Please check back later.',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO maintenance_mode (id, enabled, message) VALUES (1, false, 'System is under maintenance. Please check back later.')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE maintenance_mode ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read maintenance mode" ON maintenance_mode;
CREATE POLICY "Public can read maintenance mode"
  ON maintenance_mode FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update maintenance mode" ON maintenance_mode;
CREATE POLICY "Admins can update maintenance mode"
  ON maintenance_mode FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION is_maintenance_mode()
RETURNS BOOLEAN AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT enabled INTO v_enabled FROM maintenance_mode WHERE id = 1;
  RETURN COALESCE(v_enabled, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
