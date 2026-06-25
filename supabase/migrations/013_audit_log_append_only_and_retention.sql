-- BUG-013: Append-only enforcement and retention for audit_logs

-- Prevent updates and deletes on audit_logs at the database level
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs are append-only: UPDATE and DELETE are not permitted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_append_only ON audit_logs;
CREATE TRIGGER trg_audit_logs_append_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- RLS policies that reinforce append-only (belt and suspenders with the trigger)
DROP POLICY IF EXISTS "Admins can read audit logs" ON audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON audit_logs FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Explicitly deny UPDATE and DELETE
DROP POLICY IF EXISTS "No update on audit_logs" ON audit_logs;
CREATE POLICY "No update on audit_logs"
  ON audit_logs FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "No delete on audit_logs" ON audit_logs;
CREATE POLICY "No delete on audit_logs"
  ON audit_logs FOR DELETE
  USING (false);

-- Retention: auto-cleanup function (delete logs older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create an index on created_at for efficient retention cleanup queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
