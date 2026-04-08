-- =========================================================
-- Migration: 00002_rls_policies.sql
-- Row Level Security policies for all tables
-- Enable Supabase Realtime on workout_logs
-- =========================================================

-- ── Enable RLS on all tables ─────────────────────────────
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_cache ENABLE ROW LEVEL SECURITY;

-- ── users ────────────────────────────────────────────────
-- Users can read their own row
CREATE POLICY "users: read own"
  ON public.users FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

-- Coaches can read the users rows of their trainees
CREATE POLICY "users: coach reads trainees"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.coach_id = (SELECT auth.uid())
        AND c.trainee_id = public.users.id
    )
  );

-- Users can update their own profile (name only — role/email changes handled separately)
CREATE POLICY "users: update own"
  ON public.users FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ── clients ──────────────────────────────────────────────
-- Coaches see only their own client rows
CREATE POLICY "clients: coach read own"
  ON public.clients FOR SELECT
  TO authenticated
  USING (coach_id = (SELECT auth.uid()));

-- Trainees see their own client row
CREATE POLICY "clients: trainee read own"
  ON public.clients FOR SELECT
  TO authenticated
  USING (trainee_id = (SELECT auth.uid()));

-- Only service role can INSERT (coach creates via admin API)
-- Coaches can update status of their clients
CREATE POLICY "clients: coach update status"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (coach_id = (SELECT auth.uid()))
  WITH CHECK (coach_id = (SELECT auth.uid()));

-- ── plans ────────────────────────────────────────────────
-- Helper: check if the current user is the coach of a given client_id
-- Helper: check if the current user is the trainee of a given client_id

-- Coaches can read plans for their clients
CREATE POLICY "plans: coach read"
  ON public.plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = public.plans.client_id
        AND c.coach_id = (SELECT auth.uid())
    )
  );

-- Trainees can read their own plans
CREATE POLICY "plans: trainee read"
  ON public.plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = public.plans.client_id
        AND c.trainee_id = (SELECT auth.uid())
    )
  );

-- Coaches can insert plans for their clients
CREATE POLICY "plans: coach insert"
  ON public.plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id
        AND c.coach_id = (SELECT auth.uid())
    )
  );

-- Coaches can update plans for their clients
CREATE POLICY "plans: coach update"
  ON public.plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = public.plans.client_id
        AND c.coach_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id
        AND c.coach_id = (SELECT auth.uid())
    )
  );

-- Trainees can insert draft plans (for Smart Generator)
CREATE POLICY "plans: trainee insert draft"
  ON public.plans FOR INSERT
  TO authenticated
  WITH CHECK (
    is_draft = true
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id
        AND c.trainee_id = (SELECT auth.uid())
    )
  );

-- ── plan_exercises ───────────────────────────────────────
-- Access follows plan access
CREATE POLICY "plan_exercises: coach read"
  ON public.plan_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = public.plan_exercises.plan_id
        AND c.coach_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "plan_exercises: trainee read"
  ON public.plan_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = public.plan_exercises.plan_id
        AND c.trainee_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "plan_exercises: coach insert"
  ON public.plan_exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plans p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = plan_id
        AND c.coach_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "plan_exercises: coach delete"
  ON public.plan_exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = public.plan_exercises.plan_id
        AND c.coach_id = (SELECT auth.uid())
    )
  );

-- ── workout_logs ─────────────────────────────────────────
-- Trainees can insert and read their own workout logs
CREATE POLICY "workout_logs: trainee insert"
  ON public.workout_logs FOR INSERT
  TO authenticated
  WITH CHECK (trainee_id = (SELECT auth.uid()));

CREATE POLICY "workout_logs: trainee read"
  ON public.workout_logs FOR SELECT
  TO authenticated
  USING (trainee_id = (SELECT auth.uid()));

CREATE POLICY "workout_logs: trainee update"
  ON public.workout_logs FOR UPDATE
  TO authenticated
  USING (trainee_id = (SELECT auth.uid()))
  WITH CHECK (trainee_id = (SELECT auth.uid()));

-- Coaches can read workout logs for their clients
CREATE POLICY "workout_logs: coach read"
  ON public.workout_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.trainee_id = public.workout_logs.trainee_id
        AND c.coach_id = (SELECT auth.uid())
    )
  );

-- Coaches can mark notified = true
CREATE POLICY "workout_logs: coach update notified"
  ON public.workout_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.trainee_id = public.workout_logs.trainee_id
        AND c.coach_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.trainee_id = public.workout_logs.trainee_id
        AND c.coach_id = (SELECT auth.uid())
    )
  );

-- ── set_logs ─────────────────────────────────────────────
-- Trainees can insert and read their own set logs
CREATE POLICY "set_logs: trainee insert"
  ON public.set_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_logs wl
      WHERE wl.id = workout_log_id
        AND wl.trainee_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "set_logs: trainee read"
  ON public.set_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_logs wl
      WHERE wl.id = public.set_logs.workout_log_id
        AND wl.trainee_id = (SELECT auth.uid())
    )
  );

-- Coaches can read set logs for their clients
CREATE POLICY "set_logs: coach read"
  ON public.set_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_logs wl
      JOIN public.clients c ON c.trainee_id = wl.trainee_id
      WHERE wl.id = public.set_logs.workout_log_id
        AND c.coach_id = (SELECT auth.uid())
    )
  );

-- ── exercise_cache ───────────────────────────────────────
-- All authenticated users can read the cache
CREATE POLICY "exercise_cache: authenticated read"
  ON public.exercise_cache FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can write (enforced via no INSERT/UPDATE policy for authenticated)
-- The route handler uses the service-role client which bypasses RLS

-- ── Realtime on workout_logs ─────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_logs;
