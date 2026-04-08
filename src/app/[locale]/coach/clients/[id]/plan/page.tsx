import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlanBuilder } from "@/components/coach/PlanBuilder";
import { ClientStats } from "@/components/coach/ClientStats";
import { TabWrapper } from "@/components/ui/TabWrapper";
import { setRequestLocale, getTranslations } from "next-intl/server";

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

interface ClientJoined {
  id: string;
  status: string;
  trainee: { id: string; full_name: string; email: string } | { id: string; full_name: string; email: string }[] | null;
}

export const dynamic = 'force-dynamic';

export default async function PlanBuilderPage({ params }: PageProps) {
  const { id: clientId, locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("coach.plan");
  const tc = await getTranslations("coach.clients");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  // Load client + trainee info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientResult = await (supabase as any)
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
    .eq("coach_id", user!.id)
    .single();

  const client = clientResult.data as ClientJoined | null;

  if (!client) notFound();

  const traineeRow = Array.isArray(client.trainee) ? client.trainee[0] : client.trainee;
  const trainee = traineeRow as { id: string; full_name: string; email: string } | null;

  if (!trainee) notFound();

  // Load existing plan + days + exercises if any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const planResult = await (supabase as any)
    .from("plans")
    .select("id, name, is_draft")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const existingPlan = planResult.data as { id: string; name: string; is_draft: boolean } | null;

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

  let existingDays: { dbId: string; dayNumber: number; dayName: string; exercises: { exercise: { exerciseId: string; name: string; gifUrl: string; targetMuscles: string[]; bodyParts: string[]; equipments: string[]; secondaryMuscles: string[]; instructions: string[] }; sets: number; reps: number; restSeconds: number }[] }[] = [];

  if (existingPlan) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const daysResult = await (supabase as any)
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
    existingDays = rawDays.map((d) => ({
      dbId: d.id,
      dayNumber: d.day_number,
      dayName: d.day_name,
      exercises: (d.plan_exercises ?? [])
        .sort((a, b) => a.order_index - b.order_index)
        .map((ex) => ({
          exercise: {
            exerciseId: ex.exercise_id,
            name: ex.exercise_name,
            gifUrl: ex.gif_url ?? "",
            targetMuscles: ex.target_muscles ?? [],
            bodyParts: ex.muscle_group ? [ex.muscle_group] : [],
            equipments: [],
            secondaryMuscles: [],
            instructions: [],
          },
          sets: ex.sets,
          reps: ex.reps,
          restSeconds: ex.rest_seconds,
        })),
    }));
  }

  // ── Stats queries ───────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const traineeProfile = await sb.from("users").select("height_cm, weight_kg, date_of_birth").eq("id", trainee.id).single();
  const traineeData = traineeProfile.data as { height_cm: number | null; weight_kg: number | null; date_of_birth: string | null } | null;

  // Total workout logs (distinct plan sessions)
  const logsResult = await sb.from("workout_logs").select("id, exercise_name, sets_completed, reps_completed, logged_at").eq("trainee_id", trainee.id).order("logged_at", { ascending: false });
  const logs = (logsResult.data ?? []) as { id: string; exercise_name: string; sets_completed: number; reps_completed: number; logged_at: string }[];

  const totalWorkouts = logs.length;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = logs.filter((l) => new Date(l.logged_at) >= weekAgo).length;
  const lastWorkoutDate = logs[0]?.logged_at ?? null;

  // Streak: count consecutive days with at least one log
  let streak = 0;
  if (logs.length > 0) {
    const daySet = new Set(logs.map((l) => l.logged_at.slice(0, 10)));
    const today = new Date();
    let d = today;
    while (daySet.has(d.toISOString().slice(0, 10))) {
      streak++;
      d = new Date(d.getTime() - 86400000);
    }
  }

  // Top exercises by frequency
  const exerciseMap = new Map<string, { sessions: number; lastSets: number; lastReps: number }>();
  for (const log of logs) {
    const n = log.exercise_name.toLowerCase();
    const existing = exerciseMap.get(n);
    if (!existing) {
      exerciseMap.set(n, { sessions: 1, lastSets: log.sets_completed, lastReps: log.reps_completed });
    } else {
      existing.sessions++;
    }
  }
  const topExercises = Array.from(exerciseMap.entries())
    .sort((a, b) => b[1].sessions - a[1].sessions)
    .slice(0, 5)
    .map(([name, stats]) => ({ name, ...stats }));

  // Water today
  const todayStr = new Date().toISOString().slice(0, 10);
  const waterResult = await sb.from("water_logs").select("amount_ml").eq("user_id", trainee.id).eq("logged_date", todayStr);
  const waterToday = (waterResult.data ?? []).reduce((sum: number, row: { amount_ml: number }) => sum + row.amount_ml, 0);

  return (
    <div style={{ padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <a
          href="/coach/clients"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "var(--color-text-muted)",
            fontSize: "14px",
            textDecoration: "none",
            marginBottom: "16px",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {tc("title")}
        </a>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--color-text)", lineHeight: 1.2 }}>
          {trainee.full_name}
        </h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "4px", fontSize: "15px" }}>
          {t("planFor", { name: trainee.full_name })}
        </p>
      </div>

      <TabWrapper tabs={[{ id: "plan", label: existingPlan ? t("editPlan") : t("buildPlan") }, { id: "stats", label: t("clientStats") }]}>
        <PlanBuilder
          clientId={clientId}
          traineeId={trainee.id}
          traineeName={trainee.full_name}
          existingPlanId={existingPlan?.id}
          existingPlanName={existingPlan?.name}
          isDraft={existingPlan?.is_draft ?? false}
          existingDays={existingDays}
        />
        <ClientStats
          trainee={{ fullName: trainee.full_name, email: trainee.email, heightCm: traineeData?.height_cm, weightKg: traineeData?.weight_kg, dateOfBirth: traineeData?.date_of_birth }}
          workoutStats={{ totalWorkouts, thisWeek, lastWorkoutDate, streak }}
          topExercises={topExercises}
          waterToday={waterToday}
        />
      </TabWrapper>
    </div>
  );
}
