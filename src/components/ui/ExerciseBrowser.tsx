"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { MUSCLE_GROUP_MAP } from "@/lib/exercises";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { ExerciseDetailModal, type ModalExercise } from "@/components/ui/ExerciseDetailModal";
import Image from "next/image";
import type { ExerciseDBItem } from "@/lib/types";

const MUSCLE_GROUPS = Object.keys(MUSCLE_GROUP_MAP) as string[];
const PAGE_SIZE = 20;

function BrowseCard({ exercise, onTap }: { exercise: ExerciseDBItem; onTap: () => void }) {
  return (
    <div
      onClick={onTap}
      className="btn-tap"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px",
        borderRadius: "16px",
        backgroundColor: "var(--color-surface)",
        border: "1.5px solid var(--color-border)",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "12px",
          overflow: "hidden",
          flexShrink: 0,
          backgroundColor: "var(--color-bg)",
        }}
      >
        <Image
          src={exercise.gifUrl}
          alt={exercise.name}
          width={64}
          height={64}
          unoptimized
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "var(--color-text)",
          textTransform: "capitalize",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {exercise.name}
        </p>
        <p style={{ fontSize: "12px", color: "var(--color-text-muted)", textTransform: "capitalize", marginTop: "2px" }}>
          {exercise.bodyParts?.[0] ?? exercise.targetMuscles?.[0] ?? ""}
        </p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  );
}

interface ExerciseBrowserProps {
  title?: string;
  subtitle?: string;
  defaultGroup?: string;
}

export function ExerciseBrowser({ title = "Exercise Library", subtitle = "Tap any exercise to view the GIF & instructions", defaultGroup = "chest" }: ExerciseBrowserProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>(defaultGroup);
  const [exercises, setExercises] = useState<ExerciseDBItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [detailExercise, setDetailExercise] = useState<ModalExercise | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchGroup = useCallback(async (group: string) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSelectedGroup(group);
    setLoading(true);
    setExercises([]);
    setOffset(0);
    setHasMore(false);

    try {
      const res = await fetch(`/api/exercises?muscle=${group}&limit=${PAGE_SIZE}&offset=0`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { data: ExerciseDBItem[] };
      const results = data.data ?? [];
      setExercises(results);
      setOffset(results.length);
      setHasMore(results.length >= PAGE_SIZE);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        // silently fail
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!selectedGroup || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/exercises?muscle=${selectedGroup}&limit=${PAGE_SIZE}&offset=${offset}`);
      if (!res.ok) throw new Error();
      const data = await res.json() as { data: ExerciseDBItem[] };
      const results = data.data ?? [];
      setExercises((prev) => [...prev, ...results]);
      setOffset((prev) => prev + results.length);
      setHasMore(results.length >= PAGE_SIZE);
    } catch {
      // silently ignore
    } finally {
      setLoadingMore(false);
    }
  }, [selectedGroup, offset, loadingMore]);

  useEffect(() => {
    fetchGroup(defaultGroup);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: "24px 16px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
          {title}
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px", marginTop: "4px" }}>
          {subtitle}
        </p>
      </div>

      {/* Muscle group pills */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "4px",
          scrollbarWidth: "none",
          marginBottom: "20px",
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
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}

        {!loading && exercises.map((ex) => (
          <BrowseCard
            key={ex.exerciseId}
            exercise={ex}
            onTap={() => setDetailExercise({
              name: ex.name,
              gifUrl: ex.gifUrl,
              targetMuscles: ex.targetMuscles,
              bodyParts: ex.bodyParts,
              equipments: ex.equipments,
              instructions: ex.instructions,
            })}
          />
        ))}

        {!loading && hasMore && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="btn-tap"
            style={{
              marginTop: "8px",
              padding: "13px",
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
            {loadingMore ? "…" : "Load More"}
          </button>
        )}
      </div>

      <ExerciseDetailModal
        exercise={detailExercise}
        open={detailExercise !== null}
        onClose={() => setDetailExercise(null)}
      />
    </div>
  );
}
