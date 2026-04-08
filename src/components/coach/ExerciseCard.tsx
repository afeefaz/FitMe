"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ExerciseDBItem } from "@/lib/types";

interface ExerciseCardProps {
  exercise: ExerciseDBItem;
  onAdd: (exercise: ExerciseDBItem) => void;
  isAdded?: boolean;
  onDetail?: (exercise: ExerciseDBItem) => void;
  // Multi-select mode
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (exercise: ExerciseDBItem) => void;
}

export function ExerciseCard({ exercise, onAdd, isAdded, onDetail, selectable, isSelected, onToggleSelect }: ExerciseCardProps) {
  const t = useTranslations("coach.exercises");

  const activeBorder = isSelected ? "var(--color-lime)" : isAdded ? "var(--color-lime)" : "var(--color-border)";
  const activeBg = isSelected ? "rgba(204,255,0,0.06)" : "var(--color-surface)";

  return (
    <div
      onClick={selectable ? () => onToggleSelect?.(exercise) : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px",
        borderRadius: "16px",
        backgroundColor: activeBg,
        border: `1.5px solid ${activeBorder}`,
        transition: "border-color 0.2s, background-color 0.2s",
        cursor: selectable ? "pointer" : undefined,
      }}
    >
      {/* GIF thumbnail - tap to detail (non-selectable mode only) */}
      <div
        onClick={!selectable ? () => onDetail?.(exercise) : undefined}
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "12px",
          overflow: "hidden",
          flexShrink: 0,
          backgroundColor: "var(--color-bg)",
          cursor: !selectable && onDetail ? "pointer" : undefined,
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

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--color-text)",
            textTransform: "capitalize",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {exercise.name}
        </p>
        <p
          style={{
            fontSize: "12px",
            color: "var(--color-text-muted)",
            textTransform: "capitalize",
            marginTop: "2px",
          }}
        >
          {exercise.bodyParts?.[0] ?? exercise.targetMuscles?.[0] ?? ""}
        </p>
      </div>

      {/* Action button — checkbox (selectable mode) or add/added (normal mode) */}
      {selectable ? (
        <div
          style={{
            width: "26px",
            height: "26px",
            borderRadius: "50%",
            border: `2px solid ${isSelected ? "var(--color-lime)" : "var(--color-border)"}`,
            backgroundColor: isSelected ? "var(--color-lime)" : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.15s",
          }}
        >
          {isSelected && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); if (!isAdded) onAdd(exercise); }}
          disabled={isAdded}
          className="btn-tap"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "none",
            backgroundColor: isAdded ? "var(--color-lime)" : "var(--color-surface-raised)",
            color: isAdded ? "#000" : "var(--color-text)",
            cursor: isAdded ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background-color 0.2s",
          }}
          aria-label={isAdded ? t("added") : t("add")}
        >
          {isAdded ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
