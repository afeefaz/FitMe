import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ActivityDashboard } from "@/components/trainee/ActivityDashboard";
import { GithubPagesAuthGate } from "@/components/ui/GithubPagesAuthGate";
import { TraineeWorkoutsPageClient } from "@/components/trainee/TraineeWorkoutsPageClient";

const isGithubPages = process.env.GITHUB_PAGES === "true";


type Props = { params: Promise<{ locale: string }> };

export default async function TraineeWorkoutsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (isGithubPages) {
    return <TraineeWorkoutsPageClient />;
  }

  await getTranslations("trainee.activity");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const now = new Date();
  const day14Ago = new Date(now);
  day14Ago.setDate(day14Ago.getDate() - 14);

  // Fetch last 14 days of workout_logs (for weekly chart + % change)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allLogs } = await (supabase as any)
    .from("workout_logs")
    .select("id, created_at, completed_at, plan:plans(name), set_logs(id)")
    .eq("trainee_id", user!.id)
    .gte("created_at", day14Ago.toISOString())
    .order("created_at", { ascending: false });

  // Today's water logs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: waterLogs } = await (supabase as any)
    .from("water_logs")
    .select("amount_ml")
    .eq("user_id", user!.id)
    .gte("logged_at", todayStart.toISOString())
    .lte("logged_at", todayEnd.toISOString());

  const todayWaterMl = (waterLogs ?? []).reduce(
    (s: number, r: { amount_ml: number }) => s + (r.amount_ml ?? 0),
    0
  );

  // Build per-day set counts for last 14 days
  const daySets: Record<string, number> = {};
  const dayFirstLast: Record<string, { first: Date; last: Date }> = {};

  for (const row of allLogs ?? []) {
    const d = new Date(row.created_at);
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const sets = Array.isArray(row.set_logs)
      ? row.set_logs.length
      : row.set_logs
      ? 1
      : 0;
    daySets[key] = (daySets[key] ?? 0) + sets;
    if (!dayFirstLast[key]) {
      dayFirstLast[key] = { first: d, last: d };
    } else {
      if (d < dayFirstLast[key].first) dayFirstLast[key].first = d;
      if (d > dayFirstLast[key].last) dayFirstLast[key].last = d;
    }
  }

  const todayKey = now.toISOString().slice(0, 10);
  const todaySets = daySets[todayKey] ?? 0;
  const todayCalories = todaySets * 8;
  let todayActiveMin = 0;
  if (dayFirstLast[todayKey]) {
    const { first, last } = dayFirstLast[todayKey];
    const diffMin = Math.round((last.getTime() - first.getTime()) / 60000);
    todayActiveMin = Math.max(diffMin, Math.round(todaySets * 2.5));
  }

  // Build 7-day chart (Mon→Sun of current week) and previous 7 days for % change
  const weekDays: { label: string; sets: number; dateKey: string }[] = [];
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    weekDays.push({
      label: d.toLocaleDateString("en", { weekday: "short" }).slice(0, 3),
      sets: daySets[key] ?? 0,
      dateKey: key,
    });
  }
  const thisWeekTotal = weekDays.reduce((s, d) => s + d.sets, 0);

  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(weekStart.getDate() - 7);
  let prevWeekTotal = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(prevWeekStart);
    d.setDate(prevWeekStart.getDate() + i);
    prevWeekTotal += daySets[d.toISOString().slice(0, 10)] ?? 0;
  }
  const weekChange =
    prevWeekTotal === 0
      ? null
      : Math.round(((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100);

  // Recent workouts (last 7)
  const recentLogs = (allLogs ?? []).slice(0, 7).map((row: {
    id: string;
    created_at: string;
    completed_at: string | null;
    plan: { name: string } | { name: string }[] | null;
    set_logs: { id: string }[] | { id: string } | null;
  }) => {
    const planRaw = row.plan;
    const planName = planRaw
      ? Array.isArray(planRaw)
        ? (planRaw[0]?.name ?? "Workout")
        : planRaw.name
      : "Workout";
    const sets = Array.isArray(row.set_logs)
      ? row.set_logs.length
      : row.set_logs ? 1 : 0;
    return {
      id: row.id,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      planName,
      setCount: sets,
    };
  });

  return (
    <ActivityDashboard
      traineeId={user!.id}
      todaySets={todaySets}
      todayCalories={todayCalories}
      todayActiveMin={todayActiveMin}
      todayWaterMl={todayWaterMl}
      thisWeekTotal={thisWeekTotal}
      weekChange={weekChange}
      weekDays={weekDays}
      recentLogs={recentLogs}
      todayKey={todayKey}
    />
  );
}
