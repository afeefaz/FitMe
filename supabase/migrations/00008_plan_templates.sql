-- =========================================================
-- Migration: 00008_plan_templates.sql
-- Adds:
--   1. plan_templates table (coach-owned reusable plans)
--   2. plan_template_days table (days within a template)
--   3. plan_template_exercises table (exercises per day)
--   4. RLS policies for all new tables
--   5. Indexes for performance
-- =========================================================

-- ── 1. plan_templates ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  difficulty    TEXT NOT NULL DEFAULT 'intermediate'
                CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_plan_templates_coach ON public.plan_templates(coach_id);
CREATE INDEX idx_plan_templates_coach_updated ON public.plan_templates(coach_id, updated_at DESC);

-- ── 2. plan_template_days ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_template_days (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   UUID NOT NULL REFERENCES public.plan_templates(id) ON DELETE CASCADE,
  day_number    INT NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  day_name      TEXT NOT NULL DEFAULT '',
  UNIQUE (template_id, day_number)
);

CREATE INDEX idx_plan_template_days_template ON public.plan_template_days(template_id);

-- ── 3. plan_template_exercises ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_template_exercises (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID NOT NULL REFERENCES public.plan_templates(id) ON DELETE CASCADE,
  day_id          UUID NOT NULL REFERENCES public.plan_template_days(id) ON DELETE CASCADE,
  exercise_id     TEXT NOT NULL,
  exercise_name   TEXT NOT NULL,
  gif_url         TEXT,
  target_muscles  TEXT[] NOT NULL DEFAULT '{}',
  muscle_group    TEXT,
  sets            INT NOT NULL DEFAULT 3,
  reps            INT NOT NULL DEFAULT 10,
  rest_seconds    INT NOT NULL DEFAULT 60,
  notes           TEXT NOT NULL DEFAULT '',
  order_index     INT NOT NULL
);

CREATE INDEX idx_plan_template_exercises_template ON public.plan_template_exercises(template_id);
CREATE INDEX idx_plan_template_exercises_day ON public.plan_template_exercises(day_id, order_index);

-- ── 4. RLS for plan_templates ──────────────────────────────
ALTER TABLE public.plan_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_templates: coach read own"
  ON public.plan_templates FOR SELECT
  TO authenticated
  USING (coach_id = (SELECT auth.uid()));

CREATE POLICY "plan_templates: coach insert own"
  ON public.plan_templates FOR INSERT
  TO authenticated
  WITH CHECK (coach_id = (SELECT auth.uid()));

CREATE POLICY "plan_templates: coach update own"
  ON public.plan_templates FOR UPDATE
  TO authenticated
  USING (coach_id = (SELECT auth.uid()))
  WITH CHECK (coach_id = (SELECT auth.uid()));

CREATE POLICY "plan_templates: coach delete own"
  ON public.plan_templates FOR DELETE
  TO authenticated
  USING (coach_id = (SELECT auth.uid()));

-- ── RLS for plan_template_days ─────────────────────────────
ALTER TABLE public.plan_template_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_template_days: coach read"
  ON public.plan_template_days FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_templates pt
      WHERE pt.id = public.plan_template_days.template_id
        AND pt.coach_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "plan_template_days: coach insert"
  ON public.plan_template_days FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plan_templates pt
      WHERE pt.id = template_id
        AND pt.coach_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "plan_template_days: coach update"
  ON public.plan_template_days FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_templates pt
      WHERE pt.id = public.plan_template_days.template_id
        AND pt.coach_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "plan_template_days: coach delete"
  ON public.plan_template_days FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_templates pt
      WHERE pt.id = public.plan_template_days.template_id
        AND pt.coach_id = (SELECT auth.uid())
    )
  );

-- ── RLS for plan_template_exercises ────────────────────────
ALTER TABLE public.plan_template_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_template_exercises: coach read"
  ON public.plan_template_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_templates pt
      WHERE pt.id = public.plan_template_exercises.template_id
        AND pt.coach_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "plan_template_exercises: coach insert"
  ON public.plan_template_exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plan_templates pt
      WHERE pt.id = template_id
        AND pt.coach_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "plan_template_exercises: coach delete"
  ON public.plan_template_exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_templates pt
      WHERE pt.id = public.plan_template_exercises.template_id
        AND pt.coach_id = (SELECT auth.uid())
    )
  );

-- ── auto-update updated_at trigger ─────────────────────────
CREATE OR REPLACE FUNCTION public.update_plan_template_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER plan_templates_updated_at
  BEFORE UPDATE ON public.plan_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_plan_template_timestamp();
