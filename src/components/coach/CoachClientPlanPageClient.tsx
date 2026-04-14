"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { PlanBuilder } from "@/components/coach/PlanBuilder";
import { ClientStats } from "@/components/coach/ClientStats";
import { ClientActionsButton } from "@/components/coach/ClientActionsButton";
import { TabWrapper } from "@/components/ui/TabWrapper";
import { requireClientRole } from "@/lib/supabase/clientAuth";

type RawPlanExercise = {
  id: string;
  exercise_id: string;
  exercise_name: string;
  gif_url: string | null;
  target_muscles: string[];
  muscle_group: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  order_index: number;
  plan_day_id: string | null;
};

type RawPlanDay = {
  id: string;
  day_number: number;
  day_name: string;
  plan_exercises: RawPlanExercise[];
};

type ExistingPlanDay = {
  dbId: string;
  dayNumber: number;
  dayName: string;
  exercises: {
    exercise: {
      exerciseId: string;
      name: string;
      gifUrl: string;
      targetMuscles: string[];
      bodyParts: string[];
      equipments: string[];
      secondaryMuscles: string[];
      instructions: string[];
    };
    sets: number;
    reps: number;
    restSeconds: number;
  }[];
};

type ViewModel = {
  trainee: { id: string; full_name: string; email: string };
  existingPlan: { id: string; name: string; is_draft: boolean } | null;
  existingDays: ExistingPlanDay[];
  traineeData: { height_cm: number | null; weight_kg: number | null; date_of_birth: string | null } | null;
  workoutStats: { totalWorkouts: number; thisWeek: number; lastWorkoutDate: string | null; streak: number };
  topExercises: { name: string; sessions: number; lastSets: number; lastReps: number }[];
  waterToday: number;
};

interface CoachClientPlanPageClientProps {
  clientId: string;
}

export function CoachClientPlanPageClient({ clientId }: CoachClientPlanPageClientProps) {
  const t = useTranslations("coach.plan");
  const tc = useTranslations("coach.clients");
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vm, setVm] = useState<ViewModel | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const guard = await requireClientRole({ role: "coach", router });
        if (!guard) {
          return;
        }
        const { supabase, userId } = guard;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabase as any;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clientResult = await (sb as any)
          .from("clients")
          .select(`
            id,
            status,
            trainee:users!clients_trainee_id_fkey (
              id,
              full_name,
              email
            )
          `)
          .eq("id", clientId)
          .eq("coach_id", userId)
          .single();

        const client = clientResult.data as {
          trainee:
            | { id: string; full_name: string; email: string }
            | { id: string; full_name: string; email: string }[]
            | null;
        } | null;

        if (!client) {
          router.replace("/coach/clients");
          return;
        }

        const traineeRow = Array.isArray(client.trainee) ? client.trainee[0] : client.trainee;
        const trainee = traineeRow as { id: string; full_name: string; email: string } | null;
        if (!trainee) {
          router.replace("/coach/clients");
          return;
        }

        const planResult = await sb
          .from("plans")
          .select("id, name, is_draft")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const existingPlan = planResult.data as { id: string; name: string; is_draft: boolean } | null;

        let existingDays: ExistingPlanDay[] = [];
        if (existingPlan) {
          const daysResult = await sb
            .from("plan_days")
            .select(`
              id,
              day_number,
              day_name,
              plan_exercises (
                id,
                exercise_id,
                exercise_name,
                gif_url,
                target_muscles,
                muscle_group,
                sets,
                reps,
                rest_seconds,
                order_index,
                plan_day_id
              )
            `)
            .eq("plan_id", existingPlan.id)
            .order("day_number", { ascending: true });

          const rawDays = (daysResult.data ?? []) as RawPlanDay[];
          existingDays = rawDays.map((day) => ({
            dbId: day.id,
            dayNumber: day.day_number,
            dayName: day.day_name,
            exercises: (day.plan_exercises ?? [])
              .sort((a, b) => a.order_index - b.order_index)
              .map((exercise) => ({
                exercise: {
                  exerciseId: exercise.exercise_id,
                  name: exercise.exercise_name,
                  gifUrl: exercise.gif_url ?? "",
                  targetMuscles: exercise.target_muscles ?? [],
                  bodyParts: exercise.muscle_group ? [exercise.muscle_group] : [],
                  equipments: [],
                  secondaryMuscles: [],
                  instructions: [],
                },
                sets: exercise.sets,
                reps: exercise.reps,
                restSeconds: exercise.rest_seconds,
              })),
          }));
        }

        const traineeProfile = await sb
          .from("users")
          .select("height_cm, weight_kg, date_of_birth")
          .eq("id", trainee.id)
          .single();

        const traineeData = traineeProfile.data as {
          height_cm: number | null;
          weight_kg: number | null;
          date_of_birth: string | null;
        } | null;

        const logsResult = await sb
          .from("workout_logs")
          .select("id, exercise_name, sets_completed, reps_completed, logged_at")
          .eq("trainee_id", trainee.id)
          .order("logged_at", { ascending: false });

        const logs = (logsResult.data ?? []) as {
          id: string;
          exercise_name: string;
          sets_completed: number;
          reps_completed: number;
          logged_at: string;
        }[];

        const totalWorkouts = logs.length;
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisWeek = logs.filter((log) => new Date(log.logged_at) >= weekAgo).length;
        const lastWorkoutDate = logs[0]?.logged_at ?? null;

        let streak = 0;
        if (logs.length > 0) {
          const daySet = new Set(logs.map((log) => log.logged_at.slice(0, 10)));
          let day = new Date();
          while (daySet.has(day.toISOString().slice(0, 10))) {
            streak++;
            day = new Date(day.getTime() - 86400000);
          }
        }

        const exerciseMap = new Map<string, { sessions: number; lastSets: number; lastReps: number }>();
        for (const log of logs) {
          const name = log.exercise_name.toLowerCase();
          const existing = exerciseMap.get(name);
          if (!existing) {
            exerciseMap.set(name, {
              sessions: 1,
              lastSets: log.sets_completed,
              lastReps: log.reps_completed,
            });
          } else {
            existing.sessions++;
          }
        }

        const topExercises = Array.from(exerciseMap.entries())
          .sort((a, b) => b[1].sessions - a[1].sessions)
          .slice(0, 5)
          .map(([name, stats]) => ({ name, ...stats }));

        const todayStr = new Date().toISOString().slice(0, 10);
        const waterResult = await sb
          .from("water_logs")
          .select("amount_ml")
          .eq("user_id", trainee.id)
          .eq("logged_date", todayStr);

        const waterToday = (waterResult.data ?? []).reduce(
          (sum: number, row: { amount_ml: number }) => sum + row.amount_ml,
          0
        );

        if (cancelled) return;
        setVm({
          trainee,
          existingPlan,
          existingDays,
          traineeData,
          workoutStats: { totalWorkouts, thisWeek, lastWorkoutDate, streak },
          topExercises,
          waterToday,
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load client plan");
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
  }, [clientId, router]);

  if (loading || !vm) {
    return (
      <div style={{ padding: "24px 16px" }}>
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>Loading client plan...</p>
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
    <div style={{ padding: "24px 16px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <Link
            href="/coach/clients"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--color-text-muted)",
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {tc("title")}
          </Link>
          <ClientActionsButton
            clientId={clientId}
            traineeId={vm.trainee.id}
            traineeName={vm.trainee.full_name}
          />
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--color-text)", lineHeight: 1.2 }}>
          {vm.trainee.full_name}
        </h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "4px", fontSize: "15px" }}>
          {t("planFor", { name: vm.trainee.full_name })}
        </p>
      </div>

      <TabWrapper tabs={[{ id: "plan", label: vm.existingPlan ? t("editPlan") : t("buildPlan") }, { id: "stats", label: t("clientStats") }]}>
        <PlanBuilder
          clientId={clientId}
          traineeId={vm.trainee.id}
          traineeName={vm.trainee.full_name}
          existingPlanId={vm.existingPlan?.id}
          existingPlanName={vm.existingPlan?.name}
          isDraft={vm.existingPlan?.is_draft ?? false}
          existingDays={vm.existingDays}
        />
        <ClientStats
          trainee={{
            fullName: vm.trainee.full_name,
            email: vm.trainee.email,
            heightCm: vm.traineeData?.height_cm,
            weightKg: vm.traineeData?.weight_kg,
            dateOfBirth: vm.traineeData?.date_of_birth,
          }}
          workoutStats={vm.workoutStats}
          topExercises={vm.topExercises}
          waterToday={vm.waterToday}
        />
      </TabWrapper>
    </div>
  );
}