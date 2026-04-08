"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { cacheGet, cacheSet } from "@/lib/cache";

const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface CachedExercise {
  exerciseId: string;
  name: string;
  gifUrl: string | null;
  muscleGroup: string | null;
  sets: number;
  reps: number;
  restSeconds: number;
}

export interface CachedPlanDay {
  id: string;
  dayNumber: number;
  dayName: string;
  exercises: CachedExercise[];
}

export interface CachedPlan {
  planId: string;
  planName: string;
  days: CachedPlanDay[];
}

interface UseTraineePlanResult {
  plan: CachedPlan | null;
  loading: boolean;
}

export function useTraineePlan(traineeId: string): UseTraineePlanResult {
  const cacheKey = `fitme:plan:${traineeId}`;

  const [plan, setPlan] = useState<CachedPlan | null>(() =>
    cacheGet<CachedPlan>(cacheKey, TTL_MS)
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchPlan() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = createClient() as any;

      const { data: clientRow } = await sb
        .from("clients")
        .select(`
          plans (
            id,
            name,
            plan_days (
              id,
              day_number,
              day_name,
              plan_exercises (
                exercise_id,
                exercise_name,
                gif_url,
                muscle_group,
                sets,
                reps,
                rest_seconds,
                order_index
              )
            )
          )
        `)
        .eq("trainee_id", traineeId)
        .eq("plans.is_draft", false)
        .order("created_at", { referencedTable: "plans", ascending: false })
        .limit(1, { referencedTable: "plans" })
        .maybeSingle();

      if (cancelled) return;

      const plansRaw = clientRow?.plans;
      const planArr = plansRaw
        ? Array.isArray(plansRaw)
          ? plansRaw
          : [plansRaw]
        : [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = (planArr[0] as any) ?? null;

      if (raw) {
        const rawDays = (raw.plan_days ?? []) as Array<{
          id: string;
          day_number: number;
          day_name: string;
          plan_exercises: Array<{
            exercise_id: string;
            exercise_name: string;
            gif_url: string | null;
            muscle_group: string | null;
            sets: number;
            reps: number;
            rest_seconds: number;
            order_index: number;
          }> | null;
        }>;

        const days: CachedPlanDay[] = rawDays
          .sort((a, b) => a.day_number - b.day_number)
          .map((d) => ({
            id: d.id,
            dayNumber: d.day_number,
            dayName: d.day_name,
            exercises: (d.plan_exercises ?? [])
              .sort((a, b) => a.order_index - b.order_index)
              .map((ex) => ({
                exerciseId: ex.exercise_id,
                name: ex.exercise_name,
                gifUrl: ex.gif_url,
                muscleGroup: ex.muscle_group,
                sets: ex.sets,
                reps: ex.reps,
                restSeconds: ex.rest_seconds,
              })),
          }));

        const cached: CachedPlan = {
          planId: raw.id,
          planName: raw.name,
          days,
        };

        cacheSet(cacheKey, cached, TTL_MS);
        setPlan(cached);
      } else {
        setPlan(null);
      }

      setLoading(false);
    }

    fetchPlan().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traineeId]);

  return { plan, loading };
}
