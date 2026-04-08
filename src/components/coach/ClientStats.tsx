"use client";

import { useTranslations, useLocale } from "next-intl";

interface WorkoutStat {
  totalWorkouts: number;
  thisWeek: number;
  lastWorkoutDate: string | null;
  streak: number;
}

interface ExerciseProgress {
  name: string;
  sessions: number;
  lastSets: number;
  lastReps: number;
}

interface StatsProps {
  trainee: {
    fullName: string;
    email: string;
    heightCm?: number | null;
    weightKg?: number | null;
    dateOfBirth?: string | null;
  };
  workoutStats: WorkoutStat;
  topExercises: ExerciseProgress[];
  waterToday: number; // ml
}

function calcBmi(weightKg: number, heightCm: number) {
  const h = heightCm / 100;
  return weightKg / (h * h);
}

function bmiLabel(bmi: number, t: (k: string) => string) {
  if (bmi < 18.5) return { label: t("common.bmi.underweight"), color: "#60a5fa" };
  if (bmi < 25) return { label: t("common.bmi.normal"), color: "var(--color-lime)" };
  if (bmi < 30) return { label: t("common.bmi.overweight"), color: "var(--color-amber)" };
  return { label: t("common.bmi.obese"), color: "var(--color-red)" };
}

function calcAge(dob: string) {
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

function formatDate(dateStr: string | null, locale: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

export function ClientStats({ trainee, workoutStats, topExercises, waterToday }: StatsProps) {
  const t = useTranslations();
  const ts = useTranslations("coach.stats");
  const locale = useLocale();
  const bmi = trainee.weightKg && trainee.heightCm ? calcBmi(trainee.weightKg, trainee.heightCm) : null;
  const bmiInfo = bmi ? bmiLabel(bmi, t) : null;
  const age = trainee.dateOfBirth ? calcAge(trainee.dateOfBirth) : null;
  const waterGoalMl = 2500;
  const waterPct = Math.min(100, Math.round((waterToday / waterGoalMl) * 100));

  const statBox = (label: string, value: string | number, sub?: string, color?: string) => (
    <div style={{ flex: 1, padding: "14px 12px", borderRadius: "16px", backgroundColor: "var(--color-bg)", textAlign: "center" }}>
      <p style={{ fontSize: "22px", fontWeight: 800, color: color ?? "var(--color-text)" }}>{value}</p>
      <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>{label}</p>
      {sub && <p style={{ fontSize: "11px", color: color ?? "var(--color-text-muted)", marginTop: "2px" }}>{sub}</p>}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Workout stats */}
      <div style={{ padding: "16px 20px", borderRadius: "20px", backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>{ts("workoutActivity")}</p>
        <div style={{ display: "flex", gap: "10px" }}>
          {statBox(ts("total"), workoutStats.totalWorkouts, ts("workoutsLabel"))}
          {statBox(ts("thisWeek"), workoutStats.thisWeek, ts("sessionsLabel"))}
          {statBox(ts("streak"), `${workoutStats.streak}🔥`, ts("daysLabel"))}
          {statBox(ts("last"), formatDate(workoutStats.lastWorkoutDate, locale))}
        </div>
      </div>

      {/* Body metrics */}
      {(bmi || age) && (
        <div style={{ padding: "16px 20px", borderRadius: "20px", backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>{ts("bodyMetrics")}</p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {bmi && bmiInfo && statBox(ts("bmi"), bmi.toFixed(1), bmiInfo.label, bmiInfo.color)}
            {trainee.heightCm && statBox(ts("height"), `${trainee.heightCm}cm`)}
            {trainee.weightKg && statBox(ts("weight"), `${trainee.weightKg}kg`)}
            {age !== null && statBox(ts("age"), age, ts("yearsLabel"))}
          </div>
        </div>
      )}

      {/* Water intake */}
      <div style={{ padding: "16px 20px", borderRadius: "20px", backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{ts("hydrationToday")}</p>
          <p style={{ fontSize: "13px", fontWeight: 700, color: waterPct >= 100 ? "var(--color-lime)" : "var(--color-text-muted)" }}>{ts("hydrationAmount", { current: waterToday, goal: waterGoalMl })}</p>
        </div>
        <div style={{ height: "8px", borderRadius: "4px", backgroundColor: "var(--color-border)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${waterPct}%`, backgroundColor: waterPct >= 100 ? "var(--color-lime)" : "#60a5fa", borderRadius: "4px", transition: "width 0.4s ease" }} />
        </div>
        <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "6px" }}>{ts("hydrationPct", { pct: waterPct })}</p>
      </div>

      {/* Top exercises */}
      {topExercises.length > 0 && (
        <div style={{ padding: "16px 20px", borderRadius: "20px", backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>{ts("mostTrained")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {topExercises.map((ex) => (
              <div key={ex.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: "12px", backgroundColor: "var(--color-bg)" }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)", textTransform: "capitalize" }}>{ex.name}</p>
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{ex.sessions}× · {ex.lastSets}×{ex.lastReps}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {workoutStats.totalWorkouts === 0 && (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--color-text-muted)" }}>
          <p style={{ fontSize: "32px", marginBottom: "8px" }}>📊</p>
          <p style={{ fontSize: "14px" }}>{ts("noWorkouts", { name: trainee.fullName.split(" ")[0] })}</p>
        </div>
      )}
    </div>
  );
}
