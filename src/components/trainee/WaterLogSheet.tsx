"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";

interface WaterLogSheetProps {
  traineeId: string;
  currentMl: number;
  goalMl?: number;
  onSuccess: (delta: number) => void;
  onClose: () => void;
}

const PRESETS = [
  { emoji: "☕", labelKey: "sip",    amount: 150 },
  { emoji: "🥤", labelKey: "cup",    amount: 250 },
  { emoji: "💧", labelKey: "bottle", amount: 500 },
  { emoji: "🍶", labelKey: "large",  amount: 750 },
] as const;

export function WaterLogSheet({
  traineeId,
  currentMl,
  goalMl = 2000,
  onSuccess,
  onClose,
}: WaterLogSheetProps) {
  const t = useTranslations("trainee.water");
  const [saving, setSaving] = useState<number | null>(null);
  const [lastAdded, setLastAdded] = useState<{ id: string; amount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localTotal, setLocalTotal] = useState(currentMl);

  const handleAdd = async (amount: number) => {
    setSaving(amount);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = createClient() as any;
      const today = new Date().toISOString().slice(0, 10);
      const { data, error: err } = await sb
        .from("water_logs")
        .insert({ user_id: traineeId, amount_ml: amount, logged_date: today })
        .select("id")
        .single();
      if (err) throw new Error(err.message);
      setLastAdded({ id: data.id, amount });
      setLocalTotal((prev) => prev + amount);
      onSuccess(amount);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const handleUndo = async () => {
    if (!lastAdded) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = createClient() as any;
      await sb.from("water_logs").delete().eq("id", lastAdded.id);
      setLocalTotal((prev) => prev - lastAdded.amount);
      onSuccess(-lastAdded.amount);
      setLastAdded(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const pct = Math.min((localTotal / goalMl) * 100, 100);

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
          padding: "12px 20px 44px",
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
          {t("title")}
        </p>

        {/* Current total + undo */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 14 }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: "var(--color-text)", lineHeight: 1 }}>
            {localTotal}
          </span>
          <span style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
            / {goalMl} ml
          </span>
          {lastAdded && (
            <button
              onClick={handleUndo}
              style={{
                marginInlineStart: "auto",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--color-lime)",
                background: "rgba(204,255,0,0.1)",
                border: "none",
                borderRadius: 8,
                padding: "4px 10px",
                cursor: "pointer",
              }}
            >
              ↩ {t("undo")}
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.07)", marginBottom: 24, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              borderRadius: 3,
              background: pct >= 100 ? "var(--color-lime)" : "rgba(204,255,0,0.7)",
              transition: "width 0.35s ease",
            }}
          />
        </div>

        {/* Preset grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {PRESETS.map(({ emoji, labelKey, amount }) => (
            <button
              key={amount}
              onClick={() => handleAdd(amount)}
              disabled={saving !== null}
              className="btn-tap"
              style={{
                padding: "18px 12px",
                borderRadius: 16,
                border: "1.5px solid rgba(255,255,255,0.06)",
                background: saving === amount ? "rgba(204,255,0,0.12)" : "var(--color-bg)",
                cursor: saving !== null ? "default" : "pointer",
                opacity: saving !== null && saving !== amount ? 0.5 : 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 28 }}>{emoji}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>
                {t(labelKey)}
              </span>
              <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 500 }}>
                +{amount} ml
              </span>
            </button>
          ))}
        </div>

        {error && (
          <p style={{ color: "#ff4d4d", fontSize: 13, marginTop: 12, textAlign: "center" }}>
            {error}
          </p>
        )}
      </div>
    </>
  );
}
