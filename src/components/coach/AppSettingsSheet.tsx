"use client";

import { useState, useEffect } from "react";
import { callEdgeFunction } from "@/lib/supabase/functions";

interface AppSettingsSheetProps {
  onClose: () => void;
}

export function AppSettingsSheet({ onClose }: AppSettingsSheetProps) {
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callEdgeFunction("get-signup-enabled")
      .then((r) => r.json())
      .then((d) => {
        setSignupEnabled(d.enabled);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleToggle(value: boolean) {
    setSignupEnabled(value);
    setSaving(true);
    setError(null);
    try {
      const res = await callEdgeFunction("admin-toggle-signup", {
        method: "POST",
        body: JSON.stringify({ enabled: value }),
      }, true);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        setSignupEnabled(!value); // revert
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Network error. Please try again.");
      setSignupEnabled(!value);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          backdropFilter: "blur(4px)",
          background: "rgba(0,0,0,0.6)",
          animation: "var(--animate-fade-in)",
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 61,
          background: "var(--color-surface)",
          borderRadius: "28px 28px 0 0",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
          padding: "8px 20px 40px",
          paddingBottom: "calc(40px + env(safe-area-inset-bottom, 0px))",
          maxWidth: "480px",
          margin: "0 auto",
          animation: "sheet-up 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        <style>{`
          @keyframes sheet-up {
            from { transform: translateY(100%); opacity: 0.5; }
            to   { transform: translateY(0); opacity: 1; }
          }
        `}</style>

        {/* Handle */}
        <div
          style={{
            width: "36px",
            height: "4px",
            borderRadius: "2px",
            background: "var(--color-border)",
            margin: "8px auto 24px",
          }}
        />

        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "rgba(204,255,0,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
            }}
          >
            ⚙️
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-text)" }}>
            App Settings
          </h2>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "24px", color: "var(--color-text-muted)" }}>
            Loading…
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Signup toggle row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 18px",
                borderRadius: "var(--radius-clay)",
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div style={{ flex: 1, paddingRight: "16px" }}>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text)", marginBottom: "2px" }}>
                  Allow New Registrations
                </p>
                <p style={{ fontSize: "13px", color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                  When off, the sign up page is hidden from all users
                </p>
              </div>

              {/* Toggle switch */}
              <button
                onClick={() => !saving && handleToggle(!signupEnabled)}
                disabled={saving}
                style={{
                  width: "52px",
                  height: "30px",
                  borderRadius: "15px",
                  background: signupEnabled ? "var(--color-lime)" : "var(--color-surface-3, #333)",
                  border: "none",
                  cursor: saving ? "not-allowed" : "pointer",
                  position: "relative",
                  transition: "background 0.2s ease",
                  flexShrink: 0,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "3px",
                    left: signupEnabled ? "25px" : "3px",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: signupEnabled ? "#000" : "var(--color-text-muted)",
                    transition: "left 0.2s ease",
                  }}
                />
              </button>
            </div>

            {/* Error */}
            {error && (
              <p style={{ fontSize: "13px", color: "#FCA5A5", textAlign: "center" }}>{error}</p>
            )}

            {/* Saved confirmation */}
            {saved && (
              <div
                style={{
                  textAlign: "center",
                  padding: "10px",
                  borderRadius: "12px",
                  background: "rgba(204,255,0,0.12)",
                  color: "var(--color-lime)",
                  fontSize: "14px",
                  fontWeight: 600,
                  animation: "var(--animate-fade-in)",
                }}
              >
                ✓ Settings saved
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
