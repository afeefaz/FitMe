"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface WorkoutCardProps {
  exerciseId: string;
  name: string;
  gifUrl: string | null;
  muscleGroup: string | null;
  sets: number;
  reps: number;
  restSeconds: number;
  setsLogged: number;
  onLogSet: () => void;
  onOpenDetail?: () => void;
}

export function WorkoutCard({
  name,
  gifUrl,
  muscleGroup,
  sets,
  reps,
  restSeconds,
  setsLogged,
  onLogSet,
  onOpenDetail,
}: WorkoutCardProps) {
  const t = useTranslations("trainee.workouts");
  const [targetSets, setTargetSets] = useState(sets);
  const [targetRest, setTargetRest] = useState(restSeconds);
  const done = setsLogged >= targetSets;

  return (
    <div
      style={{
        borderRadius: "20px",
        backgroundColor: "var(--color-surface)",
        border: `1.5px solid ${done ? "var(--color-lime)" : "var(--color-border)"}`,
        overflow: "hidden",
        transition: "border-color 0.25s",
      }}
    >
      {/* GIF banner */}
      {gifUrl && (
        <div
          onClick={onOpenDetail}
          style={{ width: "100%", height: "200px", backgroundColor: "var(--color-bg)", position: "relative", cursor: onOpenDetail ? "pointer" : undefined }}
        >
          <Image
            src={gifUrl}
            alt={name}
            fill
            unoptimized
            style={{ objectFit: "contain" }}
          />
          {onOpenDetail && (
            <div style={{ position: "absolute", bottom: 8, insetInlineEnd: 8, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: "8px", padding: "4px 8px" }}>
              <span style={{ fontSize: "11px", color: "#fff", fontWeight: 600 }}>{t("tapToView")}</span>
            </div>
          )}
        </div>
      )}

      <div style={{ padding: "16px" }}>
        {/* Name + badge row */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <p
            style={{
              fontSize: "17px",
              fontWeight: 700,
              color: "var(--color-text)",
              textTransform: "capitalize",
              flex: 1,
              minWidth: 0,
            }}
          >
            {name}
          </p>
          {muscleGroup && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: "100px",
                backgroundColor: done ? "var(--color-lime)" : "rgba(204,255,0,0.12)",
                color: done ? "#000" : "var(--color-lime)",
                textTransform: "capitalize",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {muscleGroup}
            </span>
          )}
        </div>

        {/* Sets / Reps / Rest info row */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          {/* Sets — editable stepper */}
          <div
            style={{
              flex: 1,
              padding: "10px 8px",
              borderRadius: "12px",
              backgroundColor: "var(--color-bg)",
              textAlign: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <button
                onClick={() => setTargetSets((s) => Math.max(1, s - 1))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 16, lineHeight: 1, padding: "0 2px" }}
              >−</button>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text)", minWidth: 24, textAlign: "center" }}>
                {t("setsValue", { logged: setsLogged, total: targetSets })}
              </p>
              <button
                onClick={() => setTargetSets((s) => Math.min(20, s + 1))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 16, lineHeight: 1, padding: "0 2px" }}
              >+</button>
            </div>
            <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2px" }}>
              {t("setsLabel")}
            </p>
          </div>

          {/* Reps — readonly from plan */}
          <div
            style={{
              flex: 1,
              padding: "10px 8px",
              borderRadius: "12px",
              backgroundColor: "var(--color-bg)",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text)" }}>{reps}</p>
            <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2px" }}>
              {t("reps")}
            </p>
          </div>

          {/* Rest — editable stepper (increments of 5s) */}
          <div
            style={{
              flex: 1,
              padding: "10px 8px",
              borderRadius: "12px",
              backgroundColor: "var(--color-bg)",
              textAlign: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <button
                onClick={() => setTargetRest((r) => Math.max(5, r - 5))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 16, lineHeight: 1, padding: "0 2px" }}
              >−</button>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text)", minWidth: 32, textAlign: "center" }}>
                {t("restValue", { seconds: targetRest })}
              </p>
              <button
                onClick={() => setTargetRest((r) => Math.min(300, r + 5))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 16, lineHeight: 1, padding: "0 2px" }}
              >+</button>
            </div>
            <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2px" }}>
              {t("rest")}
            </p>
          </div>
        </div>

        {/* Log Set button */}
        <button
          onClick={onLogSet}
          disabled={done}
          className="btn-tap"
          style={{
            width: "100%",
            minHeight: "52px",
            borderRadius: "14px",
            border: "none",
            backgroundColor: done ? "var(--color-border)" : "var(--color-lime)",
            color: done ? "var(--color-text-muted)" : "#000",
            fontSize: "15px",
            fontWeight: 700,
            cursor: done ? "default" : "pointer",
            transition: "background-color 0.2s, transform 0.12s",
          }}
        >
          {done ? t("allSetsDone") : t("logSet")}
        </button>
      </div>
    </div>
  );
}
