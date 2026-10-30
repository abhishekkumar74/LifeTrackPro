-- Migration: Admin Audit Logs Table
-- Purpose: Records all privileged administrative mutations (entitlement changes, room closures)
-- DO NOT APPLY TO PRODUCTION UNTIL MIGRATION WINDOW

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL, -- e.g. 'ENTITLEMENT_GRANTED', 'ENTITLEMENT_REVOKED', 'STUDY_ROOM_CLOSED'
  target_type TEXT NOT NULL, -- 'user', 'study_room'
  target_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_audit_logs IS 'Audit trail capturing privileged administrative actions executed via the LifeTrack Pro admin panel.';

-- Index for temporal and target querying
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_id ON public.admin_audit_logs(target_id);

-- Row-Level Security
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Deny all client-side mutations; only the server service_role key can insert/select
DROP POLICY IF EXISTS "Deny client mutations on admin_audit_logs" ON public.admin_audit_logs;
CREATE POLICY "Deny client mutations on admin_audit_logs" ON public.admin_audit_logs
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
