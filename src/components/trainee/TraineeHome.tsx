"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { cacheGet, cacheSet } from "@/lib/cache";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { WaterLogSheet } from "@/components/trainee/WaterLogSheet";

interface TraineeHomeProps {
  traineeId: string;
  fullName: string | null;
  weightKg: number | null;
}

interface TodayStats {
  setsLogged: number;
  estCalories: number;
  activeMinutes: number;
  waterMl: number;
}

interface ActivePlan {
  planId: string;
  planName: string;
  dayCount: number;
  exerciseCount: number;
}

function getTimeOfDay(t: ReturnType<typeof useTranslations>): string {
  const h = new Date().getHours();
  if (h < 12) return t("morning");
  if (h < 17) return t("afternoon");
  return t("evening");
}

const STATS_TTL = 5 * 60 * 1000; // 5 min
const PLAN_TTL = 2 * 60 * 60 * 1000; // 2h

export function TraineeHome({ traineeId, fullName, weightKg }: TraineeHomeProps) {
  const t = useTranslations("trainee.home");
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const statsKey = `fitme:homestats:${traineeId}:${today}`;
  const planKey = `fitme:plan:${traineeId}`;

  const [plan, setPlan] = useState<ActivePlan | null>(() =>
    cacheGet<ActivePlan>(planKey + ":summary", PLAN_TTL)
  );
  const [stats, setStats] = useState<TodayStats>(() =>
    cacheGet<TodayStats>(statsKey, STATS_TTL) ?? {
      setsLogged: 0,
      estCalories: 0,
      activeMinutes: 0,
      waterMl: 0,
    }
  );
  const [loading, setLoading] = useState(!plan);
  const [showWaterSheet, setShowWaterSheet] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = createClient() as any;

      // ── Active plan summary ────────────────────────────────
      const { data: clientRow } = await sb
        .from("clients")
        .select(`plans ( id, name, plan_days ( id, plan_exercises ( id ) ) )`)
        .eq("trainee_id", traineeId)
        .eq("plans.is_draft", false)
        .order("created_at", { referencedTable: "plans", ascending: false })
        .limit(1, { referencedTable: "plans" })
        .maybeSingle();

      if (!cancelled) {
        const plansRaw = clientRow?.plans;
        const planArr = plansRaw
          ? Array.isArray(plansRaw)
            ? plansRaw
            : [plansRaw]
          : [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = (planArr[0] as any) ?? null;
        if (raw) {
          const days: unknown[] = Array.isArray(raw.plan_days) ? raw.plan_days : (raw.plan_days ? [raw.plan_days] : []);
          let exerciseCount = 0;
          for (const d of days as Array<{ plan_exercises?: unknown[] }>) {
            exerciseCount += (d.plan_exercises ?? []).length;
          }
          const summary: ActivePlan = {
            planId: raw.id,
            planName: raw.name,
            dayCount: days.length,
            exerciseCount,
          };
          cacheSet(planKey + ":summary", summary, PLAN_TTL);
          setPlan(summary);
        } else {
          setPlan(null);
        }
        setLoading(false);
      }

      // ── Today's stats ───────────────────────────────────────
      const { data: logRows } = await sb
        .from("workout_logs")
        .select("id, created_at, completed_at")
        .eq("trainee_id", traineeId)
        .gte("created_at", `${today}T00:00:00.000Z`)
        .lte("created_at", `${today}T23:59:59.999Z`);

      if (!cancelled && logRows && logRows.length > 0) {
        const logIds = (logRows as Array<{ id: string }>).map((r) => r.id);
        const { data: setRows } = await sb
          .from("set_logs")
          .select("id")
          .in("workout_log_id", logIds);
        const setsLogged = setRows ? (setRows as unknown[]).length : 0;
        const estCalories = Math.round(setsLogged * 8);
        // Active minutes: sum of time between first and last set in each workout_log
        let activeMinutes = 0;
        for (const log of logRows as Array<{ created_at: string; completed_at: string | null }>) {
          const end = log.completed_at ?? log.created_at;
          const diffMs = new Date(end).getTime() - new Date(log.created_at).getTime();
          activeMinutes += Math.round(diffMs / 60000);
        }
        activeMinutes = Math.max(activeMinutes, setsLogged > 0 ? Math.round(setsLogged * 2.5) : 0);

        // Water
        const { data: waterRows } = await sb
          .from("water_logs")
          .select("amount_ml")
          .eq("user_id", traineeId)
          .eq("logged_date", today);
        const waterMl = waterRows
          ? (waterRows as Array<{ amount_ml: number }>).reduce((s, r) => s + r.amount_ml, 0)
          : 0;

        const newStats: TodayStats = { setsLogged, estCalories, activeMinutes, waterMl };
        if (!cancelled) {
          cacheSet(statsKey, newStats, STATS_TTL);
          setStats(newStats);
        }
      }
    }

    load().catch(() => { setLoading(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traineeId]);

  const displayName = fullName ? fullName.split(" ")[0] : null;
  const timeOfDay = getTimeOfDay(t);

  return (
    <div style={{ padding: "24px 16px 32px" }}>
      {/* ── Greeting ────────────────────────────────────────── */}
      <div style={{ marginBottom: "28px" }}>
        <p suppressHydrationWarning style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
          {t("greeting", { timeOfDay })}
        </p>
        <h1 style={{ fontSize: "32px", fontWeight: 800, color: "var(--color-text)", lineHeight: 1.1 }}>
          {displayName ?? "Athlete"} 💪
        </h1>
      </div>

      {/* ── Today's Plan card ────────────────────────────────── */}
      <div style={{ marginBottom: "28px" }}>
        <p suppressHydrationWarning style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
          {t("todaysPlan")}
        </p>

        {loading ? (
          <SkeletonCard />
        ) : plan ? (
          <div
            className="card-clay"
            onClick={() => router.push(`/trainee/plans/${plan.planId}`)}
            style={{
              padding: "20px",
              background: "linear-gradient(135deg, var(--color-surface) 0%, rgba(204,255,0,0.07) 100%)",
              border: "1.5px solid rgba(204,255,0,0.25)",
              position: "relative",
              overflow: "hidden",
              cursor: "pointer",
            }}
          >
            {/* Lime glow accent */}
            <div style={{ position: "absolute", top: -30, insetInlineEnd: -30, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(204,255,0,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-text)", marginBottom: "4px" }}>
                  {plan.planName}
                </h2>
                <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
                  {t("exercises", { count: plan.exerciseCount })}
                  {plan.dayCount > 1 && ` · ${t("days", { count: plan.dayCount })}`}
                </p>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "100px", backgroundColor: "var(--color-lime)", color: "#000" }}>
                {t("todaysPlan").split("'")[0]}
              </span>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push("/trainee/workout");
                }}
                className="btn-tap"
                style={{
                  flex: 1,
                  padding: "13px",
                  borderRadius: "14px",
                  border: "none",
                  backgroundColor: "var(--color-lime)",
                  color: "#000",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {stats.setsLogged > 0 ? t("continueWorkout") : t("startWorkout")}
              </button>
            </div>
          </div>
        ) : (
          <div
            className="card-clay"
            style={{ padding: "24px", textAlign: "center" }}
          >
            <div style={{ fontSize: "40px", marginBottom: "10px" }}>🏋️</div>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text)", marginBottom: "6px" }}>
              {t("noPlan")}
            </p>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
              {t("noPlanHint")}
            </p>
          </div>
        )}
      </div>

      {/* ── Today's Activity stats ────────────────────────────── */}
      <div>
        <p suppressHydrationWarning style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
          {t("todaysActivity")}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {[
            { icon: "💪", label: t("setsLogged"), value: stats.setsLogged, unit: "", tapWater: false },
            { icon: "🔥", label: t("estCalories"), value: stats.estCalories, unit: "kcal", tapWater: false },
            { icon: "⏱", label: t("activeMin"), value: stats.activeMinutes, unit: "min", tapWater: false },
            { icon: "💧", label: t("water"), value: stats.waterMl >= 1000 ? (stats.waterMl / 1000).toFixed(1) : stats.waterMl, unit: stats.waterMl >= 1000 ? "L" : "ml", tapWater: true },
          ].map(({ icon, label, value, unit, tapWater }) => (
            <div
              key={label}
              className="card-clay"
              onClick={tapWater ? () => setShowWaterSheet(true) : undefined}
              style={{ padding: "16px", cursor: tapWater ? "pointer" : undefined }}
            >
              <div style={{ fontSize: "22px", marginBottom: "8px" }}>{icon}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "4px" }}>
                <span style={{ fontSize: "26px", fontWeight: 800, color: "var(--color-text)", lineHeight: 1 }}>
                  {value}
                </span>
                {unit && (
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)" }}>
                    {unit}
                  </span>
                )}
              </div>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {label}
              </p>
              {tapWater && (
                <p style={{ fontSize: "10px", color: "var(--color-lime)", marginTop: 4, fontWeight: 600 }}>+ {t("addWater")}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {showWaterSheet && (
        <WaterLogSheet
          traineeId={traineeId}
          currentMl={stats.waterMl}
          onSuccess={(delta) =>
            setStats((prev) => ({
              ...prev,
              waterMl: Math.max(0, prev.waterMl + delta),
            }))
          }
          onClose={() => setShowWaterSheet(false)}
        />
      )}
    </div>
  );
}
