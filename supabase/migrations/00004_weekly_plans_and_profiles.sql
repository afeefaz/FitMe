-- =========================================================
-- Migration: 00004_weekly_plans_and_profiles.sql
-- Adds:
--   1. plan_days table (weekly plan structure)
--   2. plan_day_id column on plan_exercises
--   3. Profile fields on users (height_cm, weight_kg, date_of_birth)
--   4. water_logs table
--   5. Backfill existing plans into a default Day 1
--   6. RLS policies for new tables
-- =========================================================

-- ── 1. plan_days table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_days (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  day_number    INT  NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  day_name      TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (plan_id, day_number)
);

CREATE INDEX idx_plan_days_plan ON public.plan_days(plan_id);

-- ── 2. plan_day_id column on plan_exercises ─────────────────
ALTER TABLE public.plan_exercises
  ADD COLUMN IF NOT EXISTS plan_day_id UUID REFERENCES public.plan_days(id) ON DELETE CASCADE;

-- ── 3. Profile fields on users ──────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS height_cm      NUMERIC(5, 1),
  ADD COLUMN IF NOT EXISTS weight_kg      NUMERIC(5, 1),
  ADD COLUMN IF NOT EXISTS date_of_birth  DATE;

-- ── 4. water_logs table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.water_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_ml    INT  NOT NULL CHECK (amount_ml > 0),
  logged_at    TIMESTAMPTZ DEFAULT now(),
  logged_date  DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX idx_water_logs_user_date ON public.water_logs(user_id, logged_date);

-- ── 5. Backfill existing plans into a default Day 1 ─────────
-- For every plan that has exercises but no plan_days rows, create a Day 1
-- and point all its plan_exercises to it.
DO $$
DECLARE
  r RECORD;
  new_day_id UUID;
BEGIN
  FOR r IN
    SELECT DISTINCT p.id AS plan_id
    FROM public.plans p
    JOIN public.plan_exercises pe ON pe.plan_id = p.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.plan_days pd WHERE pd.plan_id = p.id
    )
  LOOP
    INSERT INTO public.plan_days (plan_id, day_number, day_name)
    VALUES (r.plan_id, 1, 'Workout')
    RETURNING id INTO new_day_id;

    UPDATE public.plan_exercises
    SET plan_day_id = new_day_id
    WHERE plan_id = r.plan_id
      AND plan_day_id IS NULL;
  END LOOP;
END;
$$;

-- ── 6. RLS for plan_days ─────────────────────────────────────
ALTER TABLE public.plan_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_days: coach read"
  ON public.plan_days FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = public.plan_days.plan_id
        AND c.coach_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "plan_days: trainee read"
  ON public.plan_days FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = public.plan_days.plan_id
        AND c.trainee_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "plan_days: coach insert"
  ON public.plan_days FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plans p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = plan_id
        AND c.coach_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "plan_days: coach update"
  ON public.plan_days FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = public.plan_days.plan_id
        AND c.coach_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "plan_days: coach delete"
  ON public.plan_days FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = public.plan_days.plan_id
        AND c.coach_id = (SELECT auth.uid())
    )
  );

-- ── RLS for water_logs ──────────────────────────────────────
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "water_logs: user read own"
  ON public.water_logs FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "water_logs: user insert own"
  ON public.water_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Coaches can read water logs for their trainees
CREATE POLICY "water_logs: coach read trainees"
  ON public.water_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.coach_id = (SELECT auth.uid())
        AND c.trainee_id = public.water_logs.user_id
    )
  );
