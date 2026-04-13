"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { ExerciseSearch } from "./ExerciseSearch";
import { ExerciseDetailModal, type ModalExercise } from "@/components/ui/ExerciseDetailModal";
import { DeleteConfirmSheet } from "./DeleteConfirmSheet";
import { useTranslations } from "next-intl";
import type { ExerciseDBItem } from "@/lib/types";

interface PlanExerciseItem {
  exercise: ExerciseDBItem;
  sets: number;
  reps: number;
  restSeconds: number;
  notes: string;
}

interface DayState {
  localId: string;
  dayNumber: number;
  dayName: string;
  exercises: PlanExerciseItem[];
}

type Difficulty = "beginner" | "intermediate" | "advanced";

interface TemplatePlanBuilderProps {
  templateId?: string;
  existingName?: string;
  existingDescription?: string;
  existingDifficulty?: Difficulty;
  existingDays?: {
    dbId?: string;
    dayNumber: number;
    dayName: string;
    exercises: PlanExerciseItem[];
  }[];
}

type SubTab = "plan" | "search";

const DAY_NAME_SUGGESTIONS = [
  "Push Day", "Pull Day", "Leg Day", "Upper Body", "Lower Body",
  "Chest & Biceps", "Back & Triceps", "Shoulders & Arms", "Core & Cardio", "Full Body",
];

let localIdCounter = 0;
function nextLocalId() { return `tpl_${++localIdCounter}`; }

export function TemplatePlanBuilder({
  templateId,
  existingName,
  existingDescription,
  existingDifficulty,
  existingDays,
}: TemplatePlanBuilderProps) {
  const t = useTranslations("coach.plans");
  const tp = useTranslations("coach.plan");
  const router = useRouter();

  const [planName, setPlanName] = useState(existingName ?? "");
  const [description, setDescription] = useState(existingDescription ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(existingDifficulty ?? "intermediate");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | undefined>(templateId);
  const [error, setError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<SubTab>("plan");
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [detailExercise, setDetailExercise] = useState<ModalExercise | null>(null);

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  const [days, setDays] = useState<DayState[]>(() => {
    if (existingDays && existingDays.length > 0) {
      return existingDays.map((d) => ({
        localId: nextLocalId(),
        dayNumber: d.dayNumber,
        dayName: d.dayName,
        exercises: d.exercises,
      }));
    }
    return [{ localId: nextLocalId(), dayNumber: 1, dayName: t("dayDefault"), exercises: [] }];
  });

  const activeDay = days[activeDayIdx] ?? days[0];

  const addedIds = useMemo(
    () => new Set(activeDay?.exercises.map((i) => i.exercise.exerciseId) ?? []),
    [activeDay]
  );

  const addDay = () => {
    if (days.length >= 7) return;
    const newDay: DayState = {
      localId: nextLocalId(),
      dayNumber: days.length + 1,
      dayName: `Day ${days.length + 1}`,
      exercises: [],
    };
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
    (exercises: ExerciseDBItem[]) => {
      setDays((prev) =>
        prev.map((d, i) => {
          if (i !== activeDayIdx) return d;
          const existingIds = new Set(d.exercises.map((ex) => ex.exercise.exerciseId));
          const newItems = exercises
            .filter((ex) => !existingIds.has(ex.exerciseId))
            .map((ex) => ({ exercise: ex, sets: 3, reps: 10, restSeconds: 60, notes: "" }));
          return { ...d, exercises: [...d.exercises, ...newItems] };
        })
      );
      setSubTab("plan");
    },
    [activeDayIdx]
  );

  const handleUpdate = useCallback(
    (exerciseId: string, field: "sets" | "reps" | "restSeconds" | "notes", value: number | string) => {
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

  // Drag & drop handlers
  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    dragOverIdx.current = idx;
  };

  const handleDrop = () => {
    if (dragIdx === null || dragOverIdx.current === null || dragIdx === dragOverIdx.current) {
      setDragIdx(null);
      return;
    }
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== activeDayIdx) return d;
        const exercises = [...d.exercises];
        const [removed] = exercises.splice(dragIdx!, 1);
        exercises.splice(dragOverIdx.current!, 0, removed);
        return { ...d, exercises };
      })
    );
    setDragIdx(null);
    dragOverIdx.current = null;
  };

  const handleSave = async () => {
    if (!planName.trim()) {
      setError(t("errorNameRequired"));
      return;
    }
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

      // Get current user
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upsert template
      const templateResult = currentTemplateId
        ? await sb.from("plan_templates").update({
            name: planName.trim(),
            description: description.trim(),
            difficulty,
          }).eq("id", currentTemplateId).select("id").single()
        : await sb.from("plan_templates").insert({
            coach_id: user.id,
            name: planName.trim(),
            description: description.trim(),
            difficulty,
          }).select("id").single();

      const template = templateResult.data as { id: string } | null;
      if (templateResult.error || !template) throw new Error(templateResult.error?.message ?? t("errorCouldNotCreate"));
      const tplId = template.id;

      // Delete existing days (cascade deletes exercises too)
      if (currentTemplateId) {
        await sb.from("plan_template_days").delete().eq("template_id", tplId);
      }

      // Insert days
      const dayRows = days.map((d) => ({
        template_id: tplId,
        day_number: d.dayNumber,
        day_name: d.dayName,
      }));
      const daysResult = await sb.from("plan_template_days").insert(dayRows).select("id, day_number");
      if (daysResult.error) throw new Error(daysResult.error.message);

      const dayIdMap = new Map<number, string>();
      for (const row of (daysResult.data as { id: string; day_number: number }[])) {
        dayIdMap.set(row.day_number, row.id);
      }

      // Insert exercises
      const exerciseRows = days.flatMap((d) =>
        d.exercises.map((item, idx) => ({
          template_id: tplId,
          day_id: dayIdMap.get(d.dayNumber),
          exercise_id: item.exercise.exerciseId,
          exercise_name: item.exercise.name,
          gif_url: item.exercise.gifUrl,
          target_muscles: item.exercise.targetMuscles ?? [],
          muscle_group: item.exercise.bodyParts?.[0] ?? item.exercise.targetMuscles?.[0] ?? "",
          sets: item.sets,
          reps: item.reps,
          rest_seconds: item.restSeconds,
          notes: item.notes ?? "",
          order_index: idx,
        }))
      );

      if (exerciseRows.length > 0) {
        const exResult = await sb.from("plan_template_exercises").insert(exerciseRows);
        if (exResult.error) throw new Error(exResult.error.message);
      }

      if (!currentTemplateId) setCurrentTemplateId(tplId);
      router.refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError((err as Error).message ?? t("errorSomethingWrong"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentTemplateId) return;
    setDeleting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = createClient() as any;
      const { error: delError } = await sb.from("plan_templates").delete().eq("id", currentTemplateId);
      if (delError) throw new Error(delError.message);
      router.push("/coach/plans");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const totalExercises = days.reduce((sum, d) => sum + d.exercises.length, 0);

  return (
    <div>
      {/* Plan Name */}
      <div style={{ marginBottom: "16px" }}>
        <label
          htmlFor="tpl-name"
          style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}
        >
          {t("nameLabel")}
        </label>
        <input
          id="tpl-name"
          type="text"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          placeholder={t("namePlaceholder")}
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

      {/* Description */}
      <div style={{ marginBottom: "16px" }}>
        <label
          htmlFor="tpl-desc"
          style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}
        >
          {t("descriptionLabel")}
        </label>
        <textarea
          id="tpl-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          rows={3}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: "14px",
            border: "1.5px solid var(--color-border)",
            backgroundColor: "var(--color-surface)",
            color: "var(--color-text)",
            fontSize: "14px",
            outline: "none",
            boxSizing: "border-box",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Difficulty */}
      <div style={{ marginBottom: "20px" }}>
        <label
          style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}
        >
          {t("difficultyLabel")}
        </label>
        <div style={{ display: "flex", gap: "8px" }}>
          {(["beginner", "intermediate", "advanced"] as Difficulty[]).map((level) => {
            const isActive = difficulty === level;
            const colors: Record<Difficulty, string> = {
              beginner: "#22c55e",
              intermediate: "var(--color-lime)",
              advanced: "var(--color-red)",
            };
            return (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className="btn-tap"
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  borderRadius: "14px",
                  border: `1.5px solid ${isActive ? colors[level] : "var(--color-border)"}`,
                  backgroundColor: isActive ? `${colors[level]}15` : "var(--color-surface)",
                  color: isActive ? colors[level] : "var(--color-text-muted)",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  textTransform: "capitalize",
                  transition: "all 0.15s",
                }}
              >
                {t(`difficulty.${level}`)}
              </button>
            );
          })}
        </div>
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
            {tp("addDay")}
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
                placeholder={`Day ${activeDay.dayNumber} name…`}
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
                {tab === "plan" ? tp("exercisesTab", { count: activeDay.exercises.length }) : tp("addExercisesTab")}
              </button>
            ))}
          </div>

          {/* Exercise list with drag & drop and notes */}
          {subTab === "plan" && (
            <div>
              {activeDay.exercises.length === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center" }}>
                  <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
                    {tp("noExercisesAdded")}
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {activeDay.exercises.map((item, idx) => (
                    <div
                      key={item.exercise.exerciseId}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={handleDrop}
                      onDragEnd={() => setDragIdx(null)}
                      className="card-clay"
                      style={{
                        padding: "16px",
                        animation: "slide-up 0.25s ease both",
                        animationDelay: `${idx * 40}ms`,
                        opacity: dragIdx === idx ? 0.5 : 1,
                        transition: "opacity 0.15s",
                        cursor: "grab",
                      }}
                    >
                      {/* Exercise header */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                        {/* Drag handle */}
                        <div style={{ color: "var(--color-text-dim)", marginRight: "8px", cursor: "grab", flexShrink: 0, touchAction: "none" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                            <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                            <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
                          </svg>
                        </div>
                        <p
                          onClick={() => setDetailExercise({ name: item.exercise.name, gifUrl: item.exercise.gifUrl, targetMuscles: item.exercise.targetMuscles, bodyParts: item.exercise.bodyParts, equipments: item.exercise.equipments })}
                          style={{
                            fontSize: "14px",
                            fontWeight: 700,
                            color: "var(--color-text)",
                            textTransform: "capitalize",
                            flex: 1,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            cursor: "pointer",
                            textDecoration: "underline dotted",
                            textUnderlineOffset: "3px",
                          }}
                        >
                          {idx + 1}. {item.exercise.name}
                        </p>
                        <button
                          onClick={() => handleRemove(item.exercise.exerciseId)}
                          className="btn-tap"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--color-text-muted)",
                            padding: "4px",
                            marginInlineStart: "8px",
                          }}
                          aria-label={tp("removeExercise")}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>

                      {/* Sets / Reps / Rest */}
                      <div style={{ display: "flex", gap: "24px", justifyContent: "center", marginBottom: "12px" }}>
                        <NumberInput
                          label={tp("sets")}
                          value={item.sets}
                          min={1}
                          max={10}
                          onChange={(v) => handleUpdate(item.exercise.exerciseId, "sets", v)}
                        />
                        <NumberInput
                          label={tp("reps")}
                          value={item.reps}
                          min={1}
                          max={50}
                          onChange={(v) => handleUpdate(item.exercise.exerciseId, "reps", v)}
                        />
                        <NumberInput
                          label={tp("restSeconds")}
                          value={item.restSeconds}
                          min={15}
                          max={300}
                          step={15}
                          onChange={(v) => handleUpdate(item.exercise.exerciseId, "restSeconds", v)}
                        />
                      </div>

                      {/* Notes */}
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => handleUpdate(item.exercise.exerciseId, "notes", e.target.value)}
                        placeholder={t("notesPlaceholder")}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "10px",
                          border: "1px solid var(--color-border)",
                          backgroundColor: "var(--color-bg)",
                          color: "var(--color-text-muted)",
                          fontSize: "12px",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {subTab === "search" && <ExerciseSearch addedIds={addedIds} onAdd={handleAdd} />}
        </div>
      )}

      {/* Error */}
      {error && <p style={{ color: "var(--color-red)", fontSize: "13px", marginTop: "16px", textAlign: "center" }}>{error}</p>}

      {/* Success toast */}
      {saved && (
        <div style={{ marginTop: "16px", padding: "12px 16px", borderRadius: "14px", backgroundColor: "rgba(204,255,0,0.12)", border: "1px solid rgba(204,255,0,0.3)", display: "flex", alignItems: "center", gap: "8px", animation: "var(--animate-fade-in)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-lime)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-lime)", margin: 0 }}>{t("savedSuccess")}</p>
        </div>
      )}

      {/* Bottom actions */}
      <div style={{ marginTop: "32px", paddingBottom: "32px" }}>
        {/* Plan Summary */}
        {totalExercises > 0 && (
          <div style={{ marginBottom: "16px", padding: "14px 16px", borderRadius: "14px", backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("planSummary")}</p>
            {days.filter((d) => d.exercises.length > 0).map((d) => (
              <div key={d.localId} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "13px", color: "var(--color-text)" }}>{d.dayName || `Day ${d.dayNumber}`}</span>
                <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>{d.exercises.length} exercise{d.exercises.length !== 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        )}

        <Button onClick={handleSave} loading={saving} disabled={saving} style={{ width: "100%" }}>
          {saving ? t("saving") : t("saveTemplate")}
        </Button>

        {/* Delete button (edit mode only) */}
        {currentTemplateId && (
          <button
            onClick={() => setShowDelete(true)}
            className="btn-tap"
            style={{
              width: "100%",
              marginTop: "12px",
              padding: "14px",
              borderRadius: "var(--radius-clay)",
              border: "1.5px solid rgba(239,68,68,0.3)",
              backgroundColor: "transparent",
              color: "var(--color-red)",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t("deleteTemplate")}
          </button>
        )}
      </div>

      {/* Exercise Detail Modal */}
      <ExerciseDetailModal
        exercise={detailExercise}
        open={detailExercise !== null}
        onClose={() => setDetailExercise(null)}
      />

      {/* Delete Confirmation Sheet */}
      <DeleteConfirmSheet
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        deleting={deleting}
        planName={planName}
      />
    </div>
  );
}

/* ── NumberInput helper ──────────────────────────────── */
function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="btn-tap"
        style={{
          width: "28px", height: "28px", borderRadius: "8px", border: "none",
          backgroundColor: "var(--color-surface-2)", color: "var(--color-text)",
          cursor: "pointer", fontSize: "16px", lineHeight: 1,
        }}
      >+</button>
      <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text)", lineHeight: 1 }}>
        {value}
      </span>
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="btn-tap"
        style={{
          width: "28px", height: "28px", borderRadius: "8px", border: "none",
          backgroundColor: "var(--color-surface-2)", color: "var(--color-text)",
          cursor: "pointer", fontSize: "16px", lineHeight: 1,
        }}
      >−</button>
      <span style={{ fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
    </div>
  );
}
