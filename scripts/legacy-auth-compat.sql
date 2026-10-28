-- Narrow compatibility bridge for the legacy RetailMind auth schema only.
-- Does not mark the original TypeORM initialization migration as applied.
-- Run with psql -v ON_ERROR_STOP=1 after backup and a full schema review.
BEGIN;
SELECT pg_advisory_xact_lock(782021028);
LOCK TABLE public.users, public.roles IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL OR to_regclass('public.roles') IS NULL THEN
    RAISE EXCEPTION 'Expected legacy users and roles tables';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='phone' AND data_type='character varying') THEN
    RAISE EXCEPTION 'Expected legacy users.phone varchar';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='phone_number')
     OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='roles' AND column_name='permissions')
     OR to_regclass('public.auth_refresh_sessions') IS NOT NULL
     OR to_regclass('public.retailmind_auth_compat_history') IS NOT NULL THEN
    RAISE EXCEPTION 'Schema differs from expected legacy state; stop for review';
  END IF;
END $$;

ALTER TABLE public.users ADD COLUMN phone_number varchar(50);
UPDATE public.users SET phone_number = phone;
ALTER TABLE public.roles ADD COLUMN permissions text[] NOT NULL DEFAULT '{}';

CREATE FUNCTION public.retailmind_sync_user_phone() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.phone IS NOT NULL AND NEW.phone_number IS NOT NULL AND NEW.phone IS DISTINCT FROM NEW.phone_number THEN
      RAISE EXCEPTION 'Conflicting phone values';
    END IF;
    NEW.phone := COALESCE(NEW.phone, NEW.phone_number);
    NEW.phone_number := NEW.phone;
  ELSIF NEW.phone IS DISTINCT FROM OLD.phone AND NEW.phone_number IS DISTINCT FROM OLD.phone_number THEN
    IF NEW.phone IS DISTINCT FROM NEW.phone_number THEN RAISE EXCEPTION 'Conflicting phone values'; END IF;
  ELSIF NEW.phone IS DISTINCT FROM OLD.phone THEN
    NEW.phone_number := NEW.phone;
  ELSIF NEW.phone_number IS DISTINCT FROM OLD.phone_number THEN
    NEW.phone := NEW.phone_number;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER retailmind_user_phone_sync BEFORE INSERT OR UPDATE OF phone, phone_number ON public.users
FOR EACH ROW EXECUTE FUNCTION public.retailmind_sync_user_phone();

CREATE TABLE public.auth_refresh_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_auth_refresh_sessions_user ON public.auth_refresh_sessions(user_id);
CREATE TABLE public.retailmind_auth_compat_history (
  change_id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.retailmind_auth_compat_history(change_id) VALUES ('legacy-auth-compat-v1');
COMMIT;
