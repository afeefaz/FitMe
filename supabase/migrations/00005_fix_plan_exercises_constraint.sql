-- Fix plan_exercises unique constraint for multi-day plans.
-- The old constraint (plan_id, order_index) was a single-day assumption.
-- With plan_days, order_index resets per day, so the constraint needs to be
-- scoped to (plan_day_id, order_index) rather than (plan_id, order_index).

ALTER TABLE plan_exercises
  DROP CONSTRAINT IF EXISTS plan_exercises_plan_id_order_index_key;

CREATE UNIQUE INDEX IF NOT EXISTS plan_exercises_day_order_idx
  ON plan_exercises (plan_day_id, order_index)
  WHERE plan_day_id IS NOT NULL;
