"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { PlanDetail } from "@/components/trainee/PlanDetail";
import { requireClientRole } from "@/lib/supabase/clientAuth";

type TraineePlanDetailPageClientProps = {
  planId: string;
};

type ViewModel = {
  traineeId: string;
  planName: string;
  days: Array<{
    id: string;
    dayNumber: number;
    dayName: string;
    exercises: Array<{
      exerciseId: string;
      name: string;
      gifUrl: string | null;
      muscleGroup: string | null;
      sets: number;
      reps: number;
      restSeconds: number;
    }>;
  }>;
  history: Array<{
    id: string;
    createdAt: string;
    completedAt: string | null;
    setCount: number;
  }>;
};

export function TraineePlanDetailPageClient({ planId }: TraineePlanDetailPageClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vm, setVm] = useState<ViewModel | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const guard = await requireClientRole({ role: "trainee", router });
        if (!guard) {
          return;
        }
        const { supabase, userId } = guard;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: clientRow } = await (supabase as any)
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
          .eq("trainee_id", userId)
          .maybeSingle();

        const plansRaw = clientRow?.plans;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const plansArr = plansRaw ? (Array.isArray(plansRaw) ? plansRaw : [plansRaw]) as any[] : [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const plan = plansArr.find((p: any) => p.id === planId) ?? null;

        if (!plan) {
          router.replace("/trainee/plans");
          return;
        }

        const rawDays = (plan.plan_days ?? []) as Array<{
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

        const days = rawDays
          .sort((a, b) => a.day_number - b.day_number)
          .map((day) => ({
            id: day.id,
            dayNumber: day.day_number,
            dayName: day.day_name,
            exercises: (day.plan_exercises ?? [])
              .sort((a, b) => a.order_index - b.order_index)
              .map((exercise) => ({
                exerciseId: exercise.exercise_id,
                name: exercise.exercise_name,
                gifUrl: exercise.gif_url,
                muscleGroup: exercise.muscle_group,
                sets: exercise.sets,
                reps: exercise.reps,
                restSeconds: exercise.rest_seconds,
              })),
          }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: historyRows } = await (supabase as any)
          .from("workout_logs")
          .select("id, created_at, completed_at, set_logs ( id )")
          .eq("trainee_id", userId)
          .eq("plan_id", planId)
          .order("created_at", { ascending: false })
          .limit(10);

        const history = (historyRows ?? []).map((row: {
          id: string;
          created_at: string;
          completed_at: string | null;
          set_logs: Array<{ id: string }> | { id: string } | null;
        }) => {
          const sets = row.set_logs
            ? Array.isArray(row.set_logs)
              ? row.set_logs
              : [row.set_logs]
            : [];
          return {
            id: row.id,
            createdAt: row.created_at,
            completedAt: row.completed_at,
            setCount: sets.length,
          };
        });

        if (cancelled) return;
        setVm({
          traineeId: userId,
          planName: plan.name,
          days,
          history,
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load plan");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [planId, router]);

  if (loading || !vm) {
    return (
      <div style={{ padding: "24px 16px" }}>
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>Loading plan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "24px 16px" }}>
        <div className="card-clay" style={{ padding: "18px" }}>
          <p style={{ color: "var(--color-red)", fontSize: "14px", fontWeight: 600 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <PlanDetail
      traineeId={vm.traineeId}
      planId={planId}
      planName={vm.planName}
      days={vm.days}
      history={vm.history}
    />
  );
}