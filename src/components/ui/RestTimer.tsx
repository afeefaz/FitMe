"use client";

import { useEffect } from "react";
import { useRestTimer } from "@/hooks/useRestTimer";
import { useTranslations } from "next-intl";

interface RestTimerProps {
  seconds: number;
  onDismiss: () => void;
}

export function RestTimer({ seconds, onDismiss }: RestTimerProps) {
  const t = useTranslations("trainee.workouts");
  const { remaining, finished, skip } = useRestTimer(seconds);

  // Auto-dismiss when finished
  useEffect(() => {
    if (finished) {
      const t = setTimeout(onDismiss, 600);
      return () => clearTimeout(t);
    }
  }, [finished, onDismiss]);

  // SVG ring maths
  const size = 160;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = seconds > 0 ? remaining / seconds : 0;
  const dashoffset = circumference * (1 - progress);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={skip}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.7)",
          zIndex: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Card — stop click propagation so only backdrop click skips */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "var(--color-surface)",
            borderRadius: "28px",
            padding: "36px 40px 28px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            minWidth: "240px",
          }}
        >
          <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {t("restTimerLabel")}
          </p>

          {/* Circular ring */}
          <div style={{ position: "relative", width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
              {/* Track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--color-border)"
                strokeWidth={strokeWidth}
              />
              {/* Progress arc */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={finished ? "#888" : "var(--color-lime)"}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashoffset}
                style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.4s" }}
              />
            </svg>
            {/* Countdown */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
              }}
            >
              <span style={{ fontSize: "44px", fontWeight: 800, color: finished ? "var(--color-text-muted)" : "var(--color-text)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {remaining}
              </span>
              <span style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "2px" }}>{t("restTimerSec")}</span>
            </div>
          </div>

          {/* Skip */}
          <button
            onClick={skip}
            className="btn-tap"
            style={{
              padding: "10px 28px",
              borderRadius: "100px",
              border: "1.5px solid var(--color-border)",
              backgroundColor: "transparent",
              color: "var(--color-text-muted)",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("restTimerSkip")}
          </button>
        </div>
      </div>
    </>
  );
}
