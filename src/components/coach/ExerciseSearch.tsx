"use client";

import { useState, useCallback, useRef } from "react";
import { MUSCLE_GROUP_MAP } from "@/lib/exercises";
import { ExerciseCard } from "./ExerciseCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { ExerciseDetailModal, type ModalExercise } from "@/components/ui/ExerciseDetailModal";
import { useTranslations } from "next-intl";
import type { ExerciseDBItem } from "@/lib/types";

const MUSCLE_GROUPS = Object.keys(MUSCLE_GROUP_MAP) as (keyof typeof MUSCLE_GROUP_MAP)[];

interface ExerciseSearchProps {
  addedIds: Set<string>;
  onAdd: (exercise: ExerciseDBItem) => void;
}

export function ExerciseSearch({ addedIds, onAdd }: ExerciseSearchProps) {
  const t = useTranslations("coach.exercises");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseDBItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailExercise, setDetailExercise] = useState<ModalExercise | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchGroup = useCallback(async (group: string) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSelectedGroup(group);
    setLoading(true);
    setError(null);
    setExercises([]);

    try {
      const res = await fetch(`/api/exercises?muscle=${group}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Failed to load exercises");
      const data = await res.json() as { data: ExerciseDBItem[] };
      setExercises(data.data ?? []);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(t("loadError"));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div>
      {/* Muscle group pills */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "4px",
          scrollbarWidth: "none",
        }}
      >
        {MUSCLE_GROUPS.map((group) => (
          <button
            key={group}
            onClick={() => fetchGroup(group)}
            className="btn-tap"
            style={{
              padding: "8px 16px",
              borderRadius: "100px",
              border: `1.5px solid ${selectedGroup === group ? "var(--color-lime)" : "var(--color-border)"}`,
              backgroundColor: selectedGroup === group ? "var(--color-lime)" : "var(--color-surface)",
              color: selectedGroup === group ? "#000" : "var(--color-text-muted)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              textTransform: "capitalize",
              transition: "all 0.15s",
            }}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Results */}
      <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}

        {error && (
          <p style={{ color: "var(--color-red)", fontSize: "14px", textAlign: "center", padding: "24px" }}>
            {error}
          </p>
        )}

        {!loading && !error && selectedGroup === null && (
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px", textAlign: "center", padding: "32px 0" }}>
            {t("selectGroup")}
          </p>
        )}

        {!loading && !error && exercises.map((ex) => (
          <ExerciseCard
            key={ex.exerciseId}
            exercise={ex}
            onAdd={onAdd}
            isAdded={addedIds.has(ex.exerciseId)}
            onDetail={(e) => setDetailExercise({ name: e.name, gifUrl: e.gifUrl, targetMuscles: e.targetMuscles, bodyParts: e.bodyParts, equipments: e.equipments, instructions: e.instructions })}
          />
        ))}
      </div>

      <ExerciseDetailModal
        exercise={detailExercise}
        open={detailExercise !== null}
        onClose={() => setDetailExercise(null)}
      />
    </div>
  );
}
