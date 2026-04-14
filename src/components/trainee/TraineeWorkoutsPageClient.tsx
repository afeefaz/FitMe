"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { ActivityDashboard } from "@/components/trainee/ActivityDashboard";
import { requireClientRole } from "@/lib/supabase/clientAuth";

type ViewModel = {
  traineeId: string;
  todaySets: number;
  todayCalories: number;
  todayActiveMin: number;
  todayWaterMl: number;
  thisWeekTotal: number;
  weekChange: number | null;
  weekDays: { label: string; sets: number; dateKey: string }[];
  recentLogs: {
    id: string;
    createdAt: string;
    completedAt: string | null;
    planName: string;
    setCount: number;
  }[];
  todayKey: string;
};

export function TraineeWorkoutsPageClient() {
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

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const now = new Date();
        const day14Ago = new Date(now);
        day14Ago.setDate(day14Ago.getDate() - 14);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: allLogs } = await (supabase as any)
          .from("workout_logs")
          .select("id, created_at, completed_at, plan:plans(name), set_logs(id)")
          .eq("trainee_id", userId)
          .gte("created_at", day14Ago.toISOString())
          .order("created_at", { ascending: false });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: waterLogs } = await (supabase as any)
          .from("water_logs")
          .select("amount_ml")
          .eq("user_id", userId)
          .gte("logged_at", todayStart.toISOString())
          .lte("logged_at", todayEnd.toISOString());

        const todayWaterMl = (waterLogs ?? []).reduce(
          (sum: number, row: { amount_ml: number }) => sum + (row.amount_ml ?? 0),
          0
        );

        const daySets: Record<string, number> = {};
        const dayFirstLast: Record<string, { first: Date; last: Date }> = {};

        for (const row of allLogs ?? []) {
          const day = new Date(row.created_at);
          const key = day.toISOString().slice(0, 10);
          const sets = Array.isArray(row.set_logs)
            ? row.set_logs.length
            : row.set_logs
            ? 1
            : 0;
          daySets[key] = (daySets[key] ?? 0) + sets;
          if (!dayFirstLast[key]) {
            dayFirstLast[key] = { first: day, last: day };
          } else {
            if (day < dayFirstLast[key].first) dayFirstLast[key].first = day;
            if (day > dayFirstLast[key].last) dayFirstLast[key].last = day;
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

        const weekDays: { label: string; sets: number; dateKey: string }[] = [];
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
        for (let i = 0; i < 7; i++) {
          const day = new Date(weekStart);
          day.setDate(weekStart.getDate() + i);
          const key = day.toISOString().slice(0, 10);
          weekDays.push({
            label: day.toLocaleDateString("en", { weekday: "short" }).slice(0, 3),
            sets: daySets[key] ?? 0,
            dateKey: key,
          });
        }
        const thisWeekTotal = weekDays.reduce((sum, day) => sum + day.sets, 0);

        const prevWeekStart = new Date(weekStart);
        prevWeekStart.setDate(weekStart.getDate() - 7);
        let prevWeekTotal = 0;
        for (let i = 0; i < 7; i++) {
          const day = new Date(prevWeekStart);
          day.setDate(prevWeekStart.getDate() + i);
          prevWeekTotal += daySets[day.toISOString().slice(0, 10)] ?? 0;
        }

        const weekChange =
          prevWeekTotal === 0
            ? null
            : Math.round(((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100);

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

        if (cancelled) return;
        setVm({
          traineeId: userId,
          todaySets,
          todayCalories,
          todayActiveMin,
          todayWaterMl,
          thisWeekTotal,
          weekChange,
          weekDays,
          recentLogs,
          todayKey,
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load activity");
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
  }, [router]);

  if (loading || !vm) {
    return (
      <div style={{ padding: "24px 16px" }}>
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>Loading activity...</p>
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
    <ActivityDashboard
      traineeId={vm.traineeId}
      todaySets={vm.todaySets}
      todayCalories={vm.todayCalories}
      todayActiveMin={vm.todayActiveMin}
      todayWaterMl={vm.todayWaterMl}
      thisWeekTotal={vm.thisWeekTotal}
      weekChange={vm.weekChange}
      weekDays={vm.weekDays}
      recentLogs={vm.recentLogs}
      todayKey={vm.todayKey}
    />
  );
}