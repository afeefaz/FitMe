-- =========================================================
-- Migration: 00007_app_settings_and_user_fields.sql
-- Adds app_settings table and sex/username columns to users
-- =========================================================

-- ── Add sex and username columns to users ────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS sex      TEXT CHECK (sex IN ('male', 'female')),
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- ── app_settings ─────────────────────────────────────────
-- Global key/value store for app configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT        NOT NULL UNIQUE,
  value       JSONB       NOT NULL DEFAULT 'null'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Seed default settings
INSERT INTO public.app_settings (key, value)
VALUES ('signup_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ── RLS on app_settings ──────────────────────────────────
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read settings
CREATE POLICY "Authenticated users can read settings"
  ON public.app_settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only coaches can modify settings
CREATE POLICY "Coaches can update settings"
  ON public.app_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'coach'
    )
  );

-- ── Update handle_new_user trigger ───────────────────────
-- Now also reads sex and username from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, full_name, sex, username)
  VALUES (
    NEW.id,
    NEW.email,
    (NEW.raw_user_meta_data->>'role')::user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NULLIF(NEW.raw_user_meta_data->>'sex', ''),
    NULLIF(NEW.raw_user_meta_data->>'username', '')
  );
  RETURN NEW;
END;
$$;
