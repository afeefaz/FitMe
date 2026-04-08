"use client";

import { useState } from "react";
import { WorkoutDashboard } from "@/components/trainee/WorkoutDashboard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { useTraineePlan } from "@/hooks/useTraineePlan";
import { useTranslations } from "next-intl";

interface WeeklyPlanViewProps {
  traineeId: string;
}

export function WeeklyPlanView({ traineeId }: WeeklyPlanViewProps) {
  const t = useTranslations("trainee.workouts");
  const { plan, loading } = useTraineePlan(traineeId);
  const [activeDayIdx, setActiveDayIdx] = useState(0);

  // ── Loading state (cold cache) ──────────────────────────────
  if (loading && !plan) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  // ── No plan ─────────────────────────────────────────────────
  if (!plan) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60dvh",
          gap: "16px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "56px" }}>🏋️</div>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--color-text)" }}>
          {t("noPlanYet")}
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "15px", maxWidth: "260px" }}>
          {t("noPlanDesc")}
        </p>
      </div>
    );
  }

  const { planId, planName, days } = plan;
  const activeDay = days[activeDayIdx] ?? days[0];

  if (days.length === 1) {
    return (
      <WorkoutDashboard
        traineeId={traineeId}
        planId={planId}
        planName={planName}
        exercises={activeDay?.exercises ?? []}
      />
    );
  }

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
          {t("yourPlan")}
        </p>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--color-text)", lineHeight: 1.2 }}>
          {planName}
        </h1>
      </div>

      {/* Day pills */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "4px",
          scrollbarWidth: "none",
          marginBottom: "24px",
        }}
      >
        {days.map((day, idx) => (
          <button
            key={day.id}
            onClick={() => setActiveDayIdx(idx)}
            className="btn-tap"
            style={{
              padding: "8px 16px",
              borderRadius: "100px",
              border: `1.5px solid ${activeDayIdx === idx ? "var(--color-lime)" : "var(--color-border)"}`,
              backgroundColor: activeDayIdx === idx ? "var(--color-lime)" : "var(--color-surface)",
              color: activeDayIdx === idx ? "#000" : "var(--color-text-muted)",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            {day.dayName || `Day ${day.dayNumber}`}
            {day.exercises.length > 0 && (
              <span
                style={{
                  marginInlineStart: "6px",
                  fontSize: "11px",
                  backgroundColor: activeDayIdx === idx ? "rgba(0,0,0,0.2)" : "rgba(204,255,0,0.15)",
                  color: activeDayIdx === idx ? "#000" : "var(--color-lime)",
                  borderRadius: "100px",
                  padding: "1px 6px",
                }}
              >
                {day.exercises.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Active day content */}
      {activeDay && (
        <WorkoutDashboard
          key={activeDay.id}
          traineeId={traineeId}
          planId={planId}
          planName={activeDay.dayName || `Day ${activeDay.dayNumber}`}
          exercises={activeDay.exercises}
          hideHeader
        />
      )}
    </>
  );
}
