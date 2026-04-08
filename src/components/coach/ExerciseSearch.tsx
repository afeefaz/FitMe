"use client";

import { useState, useCallback, useRef } from "react";
import { MUSCLE_GROUP_MAP } from "@/lib/exercises";
import { ExerciseCard } from "./ExerciseCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { ExerciseDetailModal, type ModalExercise } from "@/components/ui/ExerciseDetailModal";
import { useTranslations } from "next-intl";
import type { ExerciseDBItem } from "@/lib/types";

const MUSCLE_GROUPS = Object.keys(MUSCLE_GROUP_MAP) as (keyof typeof MUSCLE_GROUP_MAP)[];
const PAGE_SIZE = 20;

interface ExerciseSearchProps {
  addedIds: Set<string>;
  onAdd: (exercises: ExerciseDBItem[]) => void;
}

export function ExerciseSearch({ addedIds, onAdd }: ExerciseSearchProps) {
  const t = useTranslations("coach.exercises");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseDBItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [detailExercise, setDetailExercise] = useState<ModalExercise | null>(null);
  // Multi-select: Map persists across muscle group changes
  const [selectedExercises, setSelectedExercises] = useState<Map<string, ExerciseDBItem>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  const fetchGroup = useCallback(async (group: string) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSelectedGroup(group);
    setLoading(true);
    setError(null);
    setExercises([]);
    setOffset(0);
    setHasMore(false);
    // NOTE: do NOT clear selectedExercises — selections persist across muscle groups

    try {
      const res = await fetch(`/api/exercises?muscle=${group}&limit=${PAGE_SIZE}&offset=0`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Failed to load exercises");
      const data = await res.json() as { data: ExerciseDBItem[] };
      const results = data.data ?? [];
      setExercises(results);
      setOffset(results.length);
      setHasMore(results.length >= PAGE_SIZE);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(t("loadError"));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadMore = useCallback(async () => {
    if (!selectedGroup || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/exercises?muscle=${selectedGroup}&limit=${PAGE_SIZE}&offset=${offset}`);
      if (!res.ok) throw new Error("Failed to load exercises");
      const data = await res.json() as { data: ExerciseDBItem[] };
      const results = data.data ?? [];
      setExercises((prev) => [...prev, ...results]);
      setOffset((prev) => prev + results.length);
      setHasMore(results.length >= PAGE_SIZE);
    } catch {
      // silently ignore load more errors
    } finally {
      setLoadingMore(false);
    }
  }, [selectedGroup, offset, loadingMore]);

  const toggleSelect = useCallback((exercise: ExerciseDBItem) => {
    if (addedIds.has(exercise.exerciseId)) return;
    setSelectedExercises((prev) => {
      const next = new Map(prev);
      if (next.has(exercise.exerciseId)) next.delete(exercise.exerciseId);
      else next.set(exercise.exerciseId, exercise);
      return next;
    });
  }, [addedIds]);

  const handleAddSelected = () => {
    if (selectedExercises.size === 0) return;
    onAdd(Array.from(selectedExercises.values()));
    setSelectedExercises(new Map());
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Cross-muscle selection summary */}
      {selectedExercises.size > 0 && (
        <div
          style={{
            marginBottom: "10px",
            padding: "8px 12px",
            borderRadius: "12px",
            backgroundColor: "rgba(204,255,0,0.08)",
            border: "1.5px solid rgba(204,255,0,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <p style={{ color: "var(--color-lime)", fontSize: "13px", fontWeight: 700 }}>
            {selectedExercises.size} {selectedExercises.size === 1 ? "exercise" : "exercises"} selected
          </p>
          <button
            onClick={() => setSelectedExercises(new Map())}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-text-muted)",
              fontSize: "12px",
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: "8px",
            }}
          >
            Clear
          </button>
        </div>
      )}

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
            onAdd={(e) => onAdd([e])}
            isAdded={addedIds.has(ex.exerciseId)}
            selectable={!addedIds.has(ex.exerciseId)}
            isSelected={selectedExercises.has(ex.exerciseId)}
            onToggleSelect={toggleSelect}
            onDetail={(e) => setDetailExercise({ name: e.name, gifUrl: e.gifUrl, targetMuscles: e.targetMuscles, bodyParts: e.bodyParts, equipments: e.equipments, instructions: e.instructions })}
          />
        ))}

        {/* Load More */}
        {!loading && hasMore && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="btn-tap"
            style={{
              marginTop: "8px",
              padding: "12px",
              borderRadius: "14px",
              border: "1.5px dashed var(--color-border)",
              backgroundColor: "transparent",
              color: "var(--color-text-muted)",
              fontSize: "14px",
              fontWeight: 600,
              cursor: loadingMore ? "default" : "pointer",
              width: "100%",
            }}
          >
            {loadingMore ? "…" : t("loadMore")}
          </button>
        )}
      </div>

      {/* Floating "Add N exercises" button */}
      {selectedExercises.size > 0 && (
        <div
          style={{
            position: "sticky",
            bottom: "16px",
            marginTop: "16px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            onClick={handleAddSelected}
            className="btn-tap"
            style={{
              padding: "14px 28px",
              borderRadius: "100px",
              border: "none",
              backgroundColor: "var(--color-lime)",
              color: "#000",
              fontSize: "15px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(204,255,0,0.4)",
              letterSpacing: "-0.01em",
            }}
          >
            {t("addSelected", { count: selectedExercises.size })}
          </button>
        </div>
      )}

      <ExerciseDetailModal
        exercise={detailExercise}
        open={detailExercise !== null}
        onClose={() => setDetailExercise(null)}
      />
    </div>
  );
}
