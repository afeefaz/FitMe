"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { callEdgeFunction } from "@/lib/supabase/functions";

interface ClientActionsSheetProps {
  clientId: string;
  traineeId: string;
  traineeName: string;
  onClose: () => void;
}

export function ClientActionsSheet({ clientId, traineeId, traineeName, onClose }: ClientActionsSheetProps) {
  const t = useTranslations("coach.actions");
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSetPassword = async () => {
    if (newPassword.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }
    setResetting(true);
    setError(null);
    try {
      const res = await callEdgeFunction("admin-reset-password", {
        method: "POST",
        body: JSON.stringify({ traineeId, clientId, newPassword }),
      }, true);
      if (!res.ok) {
        const d = await res.json() as { error: string };
        throw new Error(d.error);
      }
      setNewPassword("");
      setSuccessMsg(t("passwordUpdated"));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setResetting(false);
    }
  };

  const handleSendResetEmail = async () => {
    setResetting(true);
    setError(null);
    try {
      const res = await callEdgeFunction("admin-reset-password", {
        method: "POST",
        body: JSON.stringify({ traineeId, clientId, sendEmail: true }),
      }, true);
      if (!res.ok) {
        const d = await res.json() as { error: string };
        throw new Error(d.error);
      }
      setSuccessMsg(t("resetEmailSent"));
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await callEdgeFunction("admin-delete-client", {
        method: "POST",
        body: JSON.stringify({ clientId, traineeId }),
      }, true);
      if (!res.ok) {
        const d = await res.json() as { error: string };
        throw new Error(d.error);
      }
      router.push("/coach/clients");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setDeleting(false);
      setConfirmDelete(false);
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
          zIndex: 50,
          animation: "var(--animate-fade-in)",
        }}
      />

      {/* Sheet */}
      <style>{`
        @keyframes csa-sheet-up {
          from { transform: translateY(100%); opacity: 0.6; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: "480px",
          margin: "0 auto",
          backgroundColor: "var(--color-surface)",
          borderRadius: "var(--radius-clay-lg) var(--radius-clay-lg) 0 0",
          padding: "24px 20px 40px",
          paddingBottom: "calc(40px + env(safe-area-inset-bottom, 0px))",
          zIndex: 51,
          animation: "csa-sheet-up 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        {/* Handle */}
        <div style={{ width: "40px", height: "4px", borderRadius: "2px", backgroundColor: "var(--color-border)", margin: "0 auto 24px" }} />

        <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-text)", marginBottom: "4px" }}>
          {t("title")}
        </h2>
        <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "28px" }}>
          {traineeName}
        </p>

        {/* Feedback messages */}
        {successMsg && (
          <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "14px", backgroundColor: "rgba(204,255,0,0.12)", border: "1px solid rgba(204,255,0,0.3)" }}>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-lime)", margin: 0 }}>{successMsg}</p>
          </div>
        )}
        {error && (
          <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "14px", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <p style={{ fontSize: "14px", color: "var(--color-red)", margin: 0 }}>{error}</p>
          </div>
        )}

        {/* ─── Reset Password ─────────────────────────────── */}
        <section style={{ marginBottom: "28px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>
            {t("resetPassword")}
          </p>

          {/* Set new password directly */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("newPasswordPlaceholder")}
                style={{
                  width: "100%",
                  padding: "11px 40px 11px 14px",
                  borderRadius: "14px",
                  border: "1.5px solid var(--color-border)",
                  backgroundColor: "var(--color-bg)",
                  color: "var(--color-text)",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: 0, display: "flex" }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
            <button
              onClick={handleSetPassword}
              disabled={resetting || newPassword.length < 8}
              className="btn-tap"
              style={{
                padding: "11px 16px",
                borderRadius: "14px",
                border: "none",
                backgroundColor: newPassword.length >= 8 ? "var(--color-lime)" : "var(--color-border)",
                color: newPassword.length >= 8 ? "#000" : "var(--color-text-muted)",
                fontSize: "13px",
                fontWeight: 700,
                cursor: newPassword.length >= 8 && !resetting ? "pointer" : "default",
                whiteSpace: "nowrap",
              }}
            >
              {resetting ? "…" : t("setPassword")}
            </button>
          </div>

          {/* Send reset email */}
          <button
            onClick={handleSendResetEmail}
            disabled={resetting}
            className="btn-tap"
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "14px",
              border: "1.5px dashed var(--color-border)",
              backgroundColor: "transparent",
              color: "var(--color-text-muted)",
              fontSize: "14px",
              fontWeight: 600,
              cursor: resetting ? "default" : "pointer",
            }}
          >
            {resetting ? "…" : t("sendResetEmail")}
          </button>
        </section>

        {/* ─── Danger Zone ────────────────────────────────── */}
        <section>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-red)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>
            {t("dangerZone")}
          </p>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn-tap"
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "14px",
                border: "1.5px solid var(--color-red)",
                backgroundColor: "transparent",
                color: "var(--color-red)",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {t("deleteClient")}
            </button>
          ) : (
            <div style={{ padding: "16px", borderRadius: "16px", border: "1.5px solid var(--color-red)", backgroundColor: "rgba(239,68,68,0.06)" }}>
              <p style={{ fontSize: "14px", color: "var(--color-text)", marginBottom: "14px", lineHeight: 1.5 }}>
                {t("deleteWarning", { name: traineeName })}
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="btn-tap"
                  style={{ flex: 1, padding: "12px", borderRadius: "14px", border: "1.5px solid var(--color-border)", backgroundColor: "transparent", color: "var(--color-text-muted)", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn-tap"
                  style={{ flex: 1, padding: "12px", borderRadius: "14px", border: "none", backgroundColor: "var(--color-red)", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: deleting ? "default" : "pointer" }}
                >
                  {deleting ? "…" : t("confirmDelete")}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
