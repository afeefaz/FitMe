-- =========================================================
-- Migration: 00001_create_tables.sql
-- Create all FitMe tables, types, indexes
-- =========================================================

-- ── ENUMs ────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('coach', 'trainee');
CREATE TYPE client_status AS ENUM ('active', 'needs_plan');

-- ── users ────────────────────────────────────────────────
-- Mirrors auth.users; one row per registered user
CREATE TABLE public.users (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL UNIQUE,
  role        user_role   NOT NULL,
  full_name   TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Automatically create a public.users row when a new auth.users row is inserted.
-- The role and full_name are passed in raw_user_meta_data at sign-up time.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    (NEW.raw_user_meta_data->>'role')::user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── clients ──────────────────────────────────────────────
-- Links a coach to a trainee
CREATE TABLE public.clients (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trainee_id  UUID          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status      client_status NOT NULL DEFAULT 'needs_plan',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE(coach_id, trainee_id)
);

-- ── plans ────────────────────────────────────────────────
CREATE TABLE public.plans (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_draft    BOOLEAN     NOT NULL DEFAULT true
);

-- ── plan_exercises ───────────────────────────────────────
CREATE TABLE public.plan_exercises (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         UUID    NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  exercise_id     TEXT    NOT NULL,
  exercise_name   TEXT    NOT NULL,
  gif_url         TEXT,
  muscle_group    TEXT,
  order_index     INT     NOT NULL,
  UNIQUE(plan_id, order_index)
);

-- ── workout_logs ─────────────────────────────────────────
CREATE TABLE public.workout_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       UUID        NOT NULL REFERENCES public.plans(id),
  trainee_id    UUID        NOT NULL REFERENCES public.users(id),
  completed_at  TIMESTAMPTZ,               -- null until all exercises logged
  notified      BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── set_logs ─────────────────────────────────────────────
CREATE TABLE public.set_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id   UUID        NOT NULL REFERENCES public.workout_logs(id) ON DELETE CASCADE,
  exercise_id      TEXT        NOT NULL,
  reps             INT         NOT NULL CHECK (reps > 0),
  weight           NUMERIC(6,2),            -- nullable for bodyweight
  logged_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── exercise_cache ───────────────────────────────────────
-- Local fallback for ExerciseDB API responses
CREATE TABLE public.exercise_cache (
  exercise_id     TEXT        PRIMARY KEY,
  name            TEXT        NOT NULL,
  gif_url         TEXT,
  target_muscles  TEXT[]      NOT NULL DEFAULT '{}',
  body_parts      TEXT[]      NOT NULL DEFAULT '{}',
  equipments      TEXT[]      NOT NULL DEFAULT '{}',
  cached_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────
CREATE INDEX idx_clients_coach    ON public.clients(coach_id);
CREATE INDEX idx_clients_trainee  ON public.clients(trainee_id);
CREATE INDEX idx_plans_client     ON public.plans(client_id);
CREATE INDEX idx_plans_client_draft ON public.plans(client_id, is_draft);
CREATE INDEX idx_plan_exercises_plan ON public.plan_exercises(plan_id, order_index);
CREATE INDEX idx_workout_logs_trainee ON public.workout_logs(trainee_id);
CREATE INDEX idx_workout_logs_plan    ON public.workout_logs(plan_id);
CREATE INDEX idx_workout_logs_notified ON public.workout_logs(notified) WHERE notified = false;
CREATE INDEX idx_set_logs_workout     ON public.set_logs(workout_log_id);
CREATE INDEX idx_set_logs_exercise    ON public.set_logs(exercise_id);
CREATE INDEX idx_exercise_cache_muscles ON public.exercise_cache USING GIN(target_muscles);
CREATE INDEX idx_exercise_cache_parts   ON public.exercise_cache USING GIN(body_parts);
