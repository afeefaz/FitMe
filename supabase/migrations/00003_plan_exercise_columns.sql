-- Add name column to plans
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'My Plan';

-- Add prescription columns to plan_exercises
ALTER TABLE public.plan_exercises
  ADD COLUMN IF NOT EXISTS sets         INT    NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS reps         INT    NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS rest_seconds INT    NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS target_muscles TEXT[] NOT NULL DEFAULT '{}';
