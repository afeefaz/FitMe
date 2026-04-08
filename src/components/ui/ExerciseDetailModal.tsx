"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

export interface ModalExercise {
  name: string;
  gifUrl: string | null;
  targetMuscles?: string[];
  bodyParts?: string[];
  equipments?: string[];
  instructions?: string[];
}

interface ExerciseDetailModalProps {
  exercise: ModalExercise | null;
  open: boolean;
  onClose: () => void;
}

export function ExerciseDetailModal({ exercise, open, onClose }: ExerciseDetailModalProps) {
  const t = useTranslations("common");
  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !exercise) return null;

  const muscles = Array.from(new Set([...(exercise.targetMuscles ?? []), ...(exercise.bodyParts ?? [])])).filter(Boolean);
  const equipment = exercise.equipments?.filter(e => e && e !== "body weight") ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={exercise.name}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0 0 env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "480px",
          maxHeight: "90dvh",
          backgroundColor: "var(--color-surface)",
          borderRadius: "28px 28px 0 0",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "12px", paddingBottom: "4px" }}>
          <div style={{ width: "40px", height: "4px", borderRadius: "2px", backgroundColor: "var(--color-border)" }} />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label={t("close")}
          style={{
            position: "absolute",
            top: "16px",
            insetInlineEnd: "16px",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "none",
            backgroundColor: "var(--color-surface-2)",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {/* GIF */}
          {exercise.gifUrl ? (
            <div style={{ width: "100%", aspectRatio: "1", backgroundColor: "var(--color-bg)", position: "relative" }}>
              <Image
                src={exercise.gifUrl}
                alt={exercise.name}
                fill
                unoptimized
                style={{ objectFit: "contain" }}
              />
            </div>
          ) : (
            <div style={{ width: "100%", aspectRatio: "1", backgroundColor: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-dim)" strokeWidth="1.5">
                <path d="M6 5v14M18 5v14M6 8h12M6 16h12M2 8h4M18 8h4M2 16h4M18 16h4"/>
              </svg>
            </div>
          )}

          {/* Info */}
          <div style={{ padding: "20px 20px 32px" }}>
            <h2 style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "var(--color-text)",
              textTransform: "capitalize",
              marginBottom: "16px",
              lineHeight: 1.2,
            }}>
              {exercise.name}
            </h2>

            {/* Muscle chips */}
            {muscles.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                  {t("muscles")}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {muscles.map(m => (
                    <span key={m} style={{
                      padding: "4px 12px",
                      borderRadius: "100px",
                      fontSize: "12px",
                      fontWeight: 600,
                      textTransform: "capitalize",
                      backgroundColor: "rgba(204,255,0,0.1)",
                      color: "var(--color-lime)",
                      border: "1px solid rgba(204,255,0,0.2)",
                    }}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Equipment */}
            {equipment.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                  {t("equipment")}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {equipment.map(e => (
                    <span key={e} style={{
                      padding: "4px 12px",
                      borderRadius: "100px",
                      fontSize: "12px",
                      fontWeight: 600,
                      textTransform: "capitalize",
                      backgroundColor: "var(--color-surface-2)",
                      color: "var(--color-text-muted)",
                      border: "1px solid var(--color-border)",
                    }}>
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            {exercise.instructions && exercise.instructions.length > 0 && (
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>
                  {t("howTo")}
                </p>
                <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {exercise.instructions.map((step, i) => (
                    <li key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                      <span style={{
                        flexShrink: 0,
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        backgroundColor: "var(--color-lime)",
                        color: "#000",
                        fontSize: "11px",
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: "1px",
                      }}>
                        {i + 1}
                      </span>
                      <p style={{ fontSize: "14px", color: "var(--color-text-muted)", lineHeight: 1.5, margin: 0 }}>
                        {step}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
