"use client";

import { useState } from "react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";

const schema = z.object({
  reps: z.coerce.number().int().min(1).max(999),
  weight: z.coerce.number().min(0).max(9999).optional().or(z.literal("")),
});

interface LogSetSheetProps {
  exerciseId: string;
  exerciseName: string;
  traineeId: string;
  planId: string;
  /** Called on successful save so parent can start rest timer + increment count */
  onSuccess: () => void;
  onClose: () => void;
}

export function LogSetSheet({
  exerciseId,
  exerciseName,
  traineeId,
  planId,
  onSuccess,
  onClose,
}: LogSetSheetProps) {
  const t = useTranslations("trainee.workouts");
  const tv = useTranslations("validation");
  const [reps, setReps] = useState("10");
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const runtimeSchema = z.object({
      reps: z.coerce.number().int().min(1, tv("repsMin")).max(999),
      weight: z.coerce.number().min(0).max(9999).optional().or(z.literal("")),
    });
    const parsed = runtimeSchema.safeParse({ reps, weight: weight === "" ? undefined : weight });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = createClient() as any;

      // Find or create today's workout_log for this plan
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      let workoutLogId: string | null = null;

      const { data: existing } = await sb
        .from("workout_logs")
        .select("id")
        .eq("plan_id", planId)
        .eq("trainee_id", traineeId)
        .gte("created_at", `${today}T00:00:00.000Z`)
        .lte("created_at", `${today}T23:59:59.999Z`)
        .is("completed_at", null)
        .maybeSingle();

      if (existing) {
        workoutLogId = existing.id;
      } else {
        const { data: created, error: createErr } = await sb
          .from("workout_logs")
          .insert({ plan_id: planId, trainee_id: traineeId })
          .select("id")
          .single();
        if (createErr) throw new Error(createErr.message);
        workoutLogId = created.id;
      }

      // Insert set_log
      const { error: setErr } = await sb.from("set_logs").insert({
        workout_log_id: workoutLogId,
        exercise_id: exerciseId,
        reps: parsed.data.reps,
        weight: parsed.data.weight !== "" && parsed.data.weight !== undefined ? parsed.data.weight : null,
      });
      if (setErr) throw new Error(setErr.message);

      onSuccess();
    } catch (err) {
      setError((err as Error).message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          zIndex: 40,
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "var(--color-surface)",
          borderRadius: "24px 24px 0 0",
          padding: "12px 20px 40px",
          zIndex: 50,
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "var(--color-border)" }} />
        </div>

        {/* Title */}
        <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "4px", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>
          {t("logSetTitle")}
        </p>
        <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-text)", textTransform: "capitalize", marginBottom: "24px" }}>
          {exerciseName}
        </h2>

        {/* Inputs */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
              {t("repsLabel")}
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "14px",
                border: "1.5px solid var(--color-border)",
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
                fontSize: "20px",
                fontWeight: 700,
                textAlign: "center",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
              {t("weightLabel")}
            </label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              placeholder={t("bodyWeightPlaceholder")}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "14px",
                border: "1.5px solid var(--color-border)",
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
                fontSize: "20px",
                fontWeight: 700,
                textAlign: "center",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {error && (
          <p style={{ color: "#ff4d4d", fontSize: "13px", marginBottom: "12px", textAlign: "center" }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-tap"
          style={{
            width: "100%",
            minHeight: "56px",
            borderRadius: "16px",
            border: "none",
            backgroundColor: saving ? "var(--color-border)" : "var(--color-lime)",
            color: saving ? "var(--color-text-muted)" : "#000",
            fontSize: "16px",
            fontWeight: 800,
            cursor: saving ? "default" : "pointer",
          }}
        >
          {saving ? t("saving") : t("saveSet")}
        </button>
      </div>
    </>
  );
}
