"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ExerciseDBItem } from "@/lib/types";
import { ExerciseDetailModal, type ModalExercise } from "@/components/ui/ExerciseDetailModal";

interface PlanExerciseItem {
  exercise: ExerciseDBItem;
  sets: number;
  reps: number;
  restSeconds: number;
}

interface PlanExerciseListProps {
  items: PlanExerciseItem[];
  onUpdate: (exerciseId: string, field: "sets" | "reps" | "restSeconds", value: number) => void;
  onRemove: (exerciseId: string) => void;
}

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
          backgroundColor: "var(--color-surface-raised)", color: "var(--color-text)",
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
          backgroundColor: "var(--color-surface-raised)", color: "var(--color-text)",
          cursor: "pointer", fontSize: "16px", lineHeight: 1,
        }}
      >−</button>
      <span style={{ fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
    </div>
  );
}

export function PlanExerciseList({ items, onUpdate, onRemove }: PlanExerciseListProps) {
  const t = useTranslations("coach.plan");
  const [detailExercise, setDetailExercise] = useState<ModalExercise | null>(null);

  if (items.length === 0) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center" }}>
        <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
          {t("noExercisesAdded")}
        </p>
      </div>
    );
  }

  return (
    <>
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {items.map((item, idx) => (
        <div
          key={item.exercise.exerciseId}
          className="card-clay"
          style={{
            padding: "16px",
            animation: "slide-up 0.25s ease both",
            animationDelay: `${idx * 40}ms`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
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
              onClick={() => onRemove(item.exercise.exerciseId)}
              className="btn-tap"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-muted)",
                padding: "4px",
                marginInlineStart: "8px",
              }}
              aria-label={t("removeExercise")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div style={{ display: "flex", gap: "24px", justifyContent: "center" }}>
            <NumberInput
              label={t("sets")}
              value={item.sets}
              min={1}
              max={10}
              onChange={(v) => onUpdate(item.exercise.exerciseId, "sets", v)}
            />
            <NumberInput
              label={t("reps")}
              value={item.reps}
              min={1}
              max={50}
              onChange={(v) => onUpdate(item.exercise.exerciseId, "reps", v)}
            />
            <NumberInput
              label={t("restSeconds")}
              value={item.restSeconds}
              min={15}
              max={300}
              step={15}
              onChange={(v) => onUpdate(item.exercise.exerciseId, "restSeconds", v)}
            />
          </div>
        </div>
      ))}
    </div>

      {/* Exercise Detail Modal */}
      <ExerciseDetailModal
        exercise={detailExercise}
        open={detailExercise !== null}
        onClose={() => setDetailExercise(null)}
      />
    </>
  );
}
