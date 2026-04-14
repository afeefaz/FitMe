import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PlanDetail } from "@/components/trainee/PlanDetail";
import { GithubPagesAuthGate } from "@/components/ui/GithubPagesAuthGate";
import { TraineePlanDetailPageClient } from "@/components/trainee/TraineePlanDetailPageClient";
import { routing } from "@/i18n/routing";

const isGithubPages = process.env.GITHUB_PAGES === "true";


type Props = { params: Promise<{ locale: string; id: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale, id: "placeholder" }));
}

export default async function PlanDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  if (isGithubPages) {
    return <TraineePlanDetailPageClient planId={id} />;
  }

  const t = await getTranslations("common");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  // Verify this plan belongs to this trainee and fetch full details
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
    .eq("trainee_id", user!.id)
    .maybeSingle();

  const plansRaw = clientRow?.plans;
  const plansArr = plansRaw
    ? Array.isArray(plansRaw)
      ? plansRaw
      : [plansRaw]
    : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plan = (plansArr as any[]).find((p: any) => p.id === id) ?? null;
  if (!plan) notFound();

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

  // Fetch last 10 workout_logs for this plan (history tab)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: historyRows } = await (supabase as any)
    .from("workout_logs")
    .select("id, created_at, completed_at, set_logs ( id )")
    .eq("trainee_id", user!.id)
    .eq("plan_id", id)
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

  const _ = t; // suppress unused warning

  return (
    <PlanDetail
      traineeId={user!.id}
      planId={id}
      planName={plan.name}
      days={days}
      history={history}
    />
  );
}
