"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { ExerciseSearch } from "./ExerciseSearch";
import { PlanExerciseList } from "./PlanExerciseList";
import { useTranslations } from "next-intl";
import type { ExerciseDBItem } from "@/lib/types";

interface PlanExerciseItem {
  exercise: ExerciseDBItem;
  sets: number;
  reps: number;
  restSeconds: number;
}

interface DayState {
  localId: string;
  dayNumber: number;
  dayName: string;
  exercises: PlanExerciseItem[];
}

interface PlanBuilderProps {
  clientId: string;
  traineeId: string;
  traineeName: string;
  existingPlanId?: string;
  existingPlanName?: string;
  existingDays?: {
    dbId?: string;
    dayNumber: number;
    dayName: string;
    exercises: PlanExerciseItem[];
  }[];
  existingExercises?: PlanExerciseItem[];
  isDraft?: boolean;
}

type SubTab = "plan" | "search";

const DAY_NAME_SUGGESTIONS = [
  "Push Day", "Pull Day", "Leg Day", "Upper Body", "Lower Body",
  "Chest & Biceps", "Back & Triceps", "Shoulders & Arms", "Core & Cardio", "Full Body",
];

let localIdCounter = 0;
function nextLocalId() { return `local_${++localIdCounter}`; }

export function PlanBuilder({
  clientId,
  traineeId,
  traineeName,
  existingPlanId,
  existingPlanName,
  existingDays,
  existingExercises,
  isDraft,
}: PlanBuilderProps) {
  // Suppress unused variable warnings for props not used in this component
  void traineeId;
  void isDraft;
  const t = useTranslations("coach.plan");
  const router = useRouter();
  const [planName, setPlanName] = useState(existingPlanName ?? t("defaultPlanName"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<SubTab>("plan");
  const [activeDayIdx, setActiveDayIdx] = useState(0);

  const [days, setDays] = useState<DayState[]>(() => {
    if (existingDays && existingDays.length > 0) {
      return existingDays.map((d) => ({
        localId: nextLocalId(),
        dayNumber: d.dayNumber,
        dayName: d.dayName,
        exercises: d.exercises,
      }));
    }
    const legacyExercises = existingExercises ?? [];
    return [{ localId: nextLocalId(), dayNumber: 1, dayName: t("dayDefault", { number: 1 }), exercises: legacyExercises }];
  });

  const activeDay = days[activeDayIdx] ?? days[0];

  const addedIds = useMemo(
    () => new Set(activeDay?.exercises.map((i) => i.exercise.exerciseId) ?? []),
    [activeDay]
  );

  const addDay = () => {
    if (days.length >= 7) return;
    const newDay: DayState = { localId: nextLocalId(), dayNumber: days.length + 1, dayName: t("dayDefault", { number: days.length + 1 }), exercises: [] };
    setDays((prev) => [...prev, newDay]);
    setActiveDayIdx(days.length);
    setSubTab("search");
  };

  const removeDay = (idx: number) => {
    if (days.length === 1) return;
    setDays((prev) =>
      prev.filter((_, i) => i !== idx).map((d, i) => ({ ...d, dayNumber: i + 1 }))
    );
    setActiveDayIdx((prev) => Math.min(prev, days.length - 2));
  };

  const updateDayName = (idx: number, name: string) => {
    setDays((prev) => prev.map((d, i) => (i === idx ? { ...d, dayName: name } : d)));
  };

  const handleAdd = useCallback(
    (exercise: ExerciseDBItem) => {
      setDays((prev) =>
        prev.map((d, i) =>
          i === activeDayIdx
            ? {
                ...d,
                exercises: d.exercises.some((ex) => ex.exercise.exerciseId === exercise.exerciseId)
                  ? d.exercises
                  : [...d.exercises, { exercise, sets: 3, reps: 10, restSeconds: 60 }],
              }
            : d
        )
      );
      setSubTab("plan");
    },
    [activeDayIdx]
  );

  const handleUpdate = useCallback(
    (exerciseId: string, field: "sets" | "reps" | "restSeconds", value: number) => {
      setDays((prev) =>
        prev.map((d, i) =>
          i === activeDayIdx
            ? { ...d, exercises: d.exercises.map((item) => (item.exercise.exerciseId === exerciseId ? { ...item, [field]: value } : item)) }
            : d
        )
      );
    },
    [activeDayIdx]
  );

  const handleRemove = useCallback(
    (exerciseId: string) => {
      setDays((prev) =>
        prev.map((d, i) =>
          i === activeDayIdx
            ? { ...d, exercises: d.exercises.filter((ex) => ex.exercise.exerciseId !== exerciseId) }
            : d
        )
      );
    },
    [activeDayIdx]
  );

  const handleSave = async () => {
    const totalExercises = days.reduce((sum, d) => sum + d.exercises.length, 0);
    if (totalExercises === 0) {
      setError(t("errorNeedExercises"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = createClient() as any;

      const planResult = existingPlanId
        ? await sb.from("plans").update({ name: planName }).eq("id", existingPlanId).select("id").single()
        : await sb.from("plans").insert({ name: planName, client_id: clientId, is_draft: false }).select("id").single();

      const plan = planResult.data as { id: string } | null;
      if (planResult.error || !plan) throw new Error(planResult.error?.message ?? t("errorCouldNotCreate"));
      const planId = plan.id;

      await sb.from("plan_days").delete().eq("plan_id", planId);

      const dayRows = days.map((d) => ({ plan_id: planId, day_number: d.dayNumber, day_name: d.dayName }));
      const daysResult = await sb.from("plan_days").insert(dayRows).select("id, day_number");
      if (daysResult.error) throw new Error(daysResult.error.message);

      const dayIdMap = new Map<number, string>();
      for (const row of (daysResult.data as { id: string; day_number: number }[])) {
        dayIdMap.set(row.day_number, row.id);
      }

      const exerciseRows = days.flatMap((d) =>
        d.exercises.map((item, idx) => ({
          plan_id: planId,
          plan_day_id: dayIdMap.get(d.dayNumber),
          exercise_id: item.exercise.exerciseId,
          exercise_name: item.exercise.name,
          gif_url: item.exercise.gifUrl,
          target_muscles: item.exercise.targetMuscles ?? [],
          muscle_group: item.exercise.bodyParts?.[0] ?? item.exercise.targetMuscles?.[0] ?? "",
          sets: item.sets,
          reps: item.reps,
          rest_seconds: item.restSeconds,
          order_index: idx,
        }))
      );

      if (exerciseRows.length > 0) {
        const exResult = await sb.from("plan_exercises").insert(exerciseRows);
        if (exResult.error) throw new Error(exResult.error.message);
      }

      await sb.from("clients").update({ status: "active" }).eq("id", clientId);
      router.push("/coach/clients");
      router.refresh();
    } catch (err) {
      setError((err as Error).message ?? t("errorSomethingWrong"));
    } finally {
      setSaving(false);
    }
  };

  const totalExercises = days.reduce((sum, d) => sum + d.exercises.length, 0);

  return (
    <div>
      {/* Plan name */}
      <div style={{ marginBottom: "20px" }}>
        <label
          htmlFor="plan-name"
          style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}
        >
          {t("planNameLabel")}
        </label>
        <input
          id="plan-name"
          type="text"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: "14px",
            border: "1.5px solid var(--color-border)",
            backgroundColor: "var(--color-surface)",
            color: "var(--color-text)",
            fontSize: "15px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Day tabs */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", scrollbarWidth: "none", marginBottom: "20px", alignItems: "center" }}>
        {days.map((day, idx) => (
          <button
            key={day.localId}
            onClick={() => { setActiveDayIdx(idx); setSubTab("plan"); }}
            className="btn-tap"
            style={{
              padding: "8px 14px",
              borderRadius: "100px",
              border: `1.5px solid ${activeDayIdx === idx ? "var(--color-lime)" : "var(--color-border)"}`,
              backgroundColor: activeDayIdx === idx ? "var(--color-lime)" : "var(--color-surface)",
              color: activeDayIdx === idx ? "#000" : "var(--color-text-muted)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            {day.dayName || `Day ${day.dayNumber}`}
            {day.exercises.length > 0 && (
              <span style={{ marginInlineStart: "6px", fontSize: "11px", backgroundColor: activeDayIdx === idx ? "rgba(0,0,0,0.2)" : "rgba(204,255,0,0.15)", color: activeDayIdx === idx ? "#000" : "var(--color-lime)", borderRadius: "100px", padding: "1px 6px" }}>
                {day.exercises.length}
              </span>
            )}
          </button>
        ))}
        {days.length < 7 && (
          <button
            onClick={addDay}
            className="btn-tap"
            style={{ padding: "8px 14px", borderRadius: "100px", border: "1.5px dashed var(--color-border)", backgroundColor: "transparent", color: "var(--color-text-muted)", fontSize: "13px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {t("addDay")}
          </button>
        )}
      </div>

      {/* Active day editor */}
      {activeDay && (
        <div>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "20px" }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={activeDay.dayName}
                onChange={(e) => updateDayName(activeDayIdx, e.target.value)}
                placeholder={t("dayPlaceholder", { number: activeDay.dayNumber })}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "14px", border: "1.5px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text)", fontSize: "15px", fontWeight: 600, outline: "none", boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
                {DAY_NAME_SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => updateDayName(activeDayIdx, s)} className="btn-tap"
                    style={{ padding: "3px 10px", borderRadius: "100px", border: `1px solid ${activeDay.dayName === s ? "var(--color-lime)" : "var(--color-border)"}`, backgroundColor: activeDay.dayName === s ? "rgba(204,255,0,0.12)" : "transparent", color: activeDay.dayName === s ? "var(--color-lime)" : "var(--color-text-muted)", fontSize: "12px", cursor: "pointer" }}
                  >{s}</button>
                ))}
              </div>
            </div>
            {days.length > 1 && (
              <button onClick={() => removeDay(activeDayIdx)} className="btn-tap" aria-label="Remove day"
                style={{ marginTop: "3px", width: "36px", height: "36px", borderRadius: "50%", border: "1.5px solid var(--color-border)", backgroundColor: "transparent", color: "var(--color-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" />
                </svg>
              </button>
            )}
          </div>

          <div style={{ display: "flex", borderBottom: "1px solid var(--color-border)", marginBottom: "20px" }}>
            {(["plan", "search"] as SubTab[]).map((tab) => (
              <button key={tab} onClick={() => setSubTab(tab)}
                style={{ flex: 1, padding: "10px 0", border: "none", background: "none", cursor: "pointer", fontSize: "14px", fontWeight: 600, color: subTab === tab ? "var(--color-lime)" : "var(--color-text-muted)", borderBottom: `2px solid ${subTab === tab ? "var(--color-lime)" : "transparent"}`, transition: "all 0.15s" }}>
                {tab === "plan" ? t("exercisesTab", { count: activeDay.exercises.length }) : t("addExercisesTab")}
              </button>
            ))}
          </div>

          {subTab === "plan" && <PlanExerciseList items={activeDay.exercises} onUpdate={handleUpdate} onRemove={handleRemove} />}
          {subTab === "search" && <ExerciseSearch addedIds={addedIds} onAdd={handleAdd} />}
        </div>
      )}

      {error && <p style={{ color: "var(--color-red)", fontSize: "13px", marginTop: "16px", textAlign: "center" }}>{error}</p>}

      <div style={{ marginTop: "32px", paddingBottom: "32px" }}>
        {totalExercises > 0 && (
          <div style={{ marginBottom: "16px", padding: "14px 16px", borderRadius: "14px", backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Plan Summary</p>
            {days.filter((d) => d.exercises.length > 0).map((d) => (
              <div key={d.localId} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "13px", color: "var(--color-text)" }}>{d.dayName || `Day ${d.dayNumber}`}</span>
                <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>{d.exercises.length} exercise{d.exercises.length !== 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        )}
        <Button onClick={handleSave} loading={saving} disabled={saving} style={{ width: "100%" }}>
          {saving ? t("saving") : t("savePlan")}
        </Button>
      </div>
    </div>
  );
}
