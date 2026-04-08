"use client";

import { useState } from "react";
import { AppSettingsSheet } from "@/components/coach/AppSettingsSheet";

export function CoachProfileExtras() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <div style={{ padding: "0 16px 16px" }}>
        <button
          onClick={() => setShowSettings(true)}
          style={{
            width: "100%",
            padding: "16px 20px",
            borderRadius: "var(--radius-clay)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
            fontSize: "15px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            boxShadow: "var(--shadow-clay-sm)",
          }}
        >
          <span
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "rgba(204,255,0,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              flexShrink: 0,
            }}
          >
            ⚙️
          </span>
          <span>App Settings</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginLeft: "auto", opacity: 0.4 }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {showSettings && <AppSettingsSheet onClose={() => setShowSettings(false)} />}
    </>
  );
}
