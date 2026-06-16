-- =============================================================
-- Fix append-only trigger blocking audit log retention cleanup
-- BUG-025: DELETE FROM audit_logs in cleanup function fires trigger
-- and always raises exception, preventing retention-based cleanup
-- =============================================================

-- Replace the trigger function to allow DELETEs when cleanup is running
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow DELETE when called from cleanup_audit_logs() (sets session var)
  IF TG_OP = 'DELETE' AND current_setting('app.audit_cleanup', true) = 'true' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'audit_logs are append-only: UPDATE and DELETE are not permitted';
END;
$$ LANGUAGE plpgsql;

-- Update cleanup function to signal the trigger before DELETE
CREATE OR REPLACE FUNCTION cleanup_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  PERFORM set_config('app.audit_cleanup', 'true', true);
  DELETE FROM audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  PERFORM set_config('app.audit_cleanup', 'false', true);
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
