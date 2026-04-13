"use client";

import { useTranslations } from "next-intl";

interface DeleteConfirmSheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
  planName: string;
}

export function DeleteConfirmSheet({ open, onClose, onConfirm, deleting, planName }: DeleteConfirmSheetProps) {
  const t = useTranslations("coach.plans");

  if (!open) return null;

  return (
    <div
      className="sheet-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "var(--color-surface)",
          borderRadius: "var(--radius-clay-lg) var(--radius-clay-lg) 0 0",
          padding: "28px 20px",
          paddingBottom: "calc(28px + env(safe-area-inset-bottom, 0px))",
          animation: "var(--animate-slide-up)",
        }}
      >
        {/* Warning icon */}
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <div
            style={{
              display: "inline-flex",
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "rgba(239,68,68,0.12)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </div>
        </div>

        <h3 style={{ textAlign: "center", fontSize: "18px", fontWeight: 800, color: "var(--color-text)", marginBottom: "8px" }}>
          {t("deleteConfirmTitle")}
        </h3>
        <p style={{ textAlign: "center", fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "24px", lineHeight: 1.5 }}>
          {t("deleteConfirmMessage", { name: planName || t("untitledPlan") })}
        </p>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={onClose}
            disabled={deleting}
            className="btn-tap"
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "var(--radius-clay)",
              border: "1.5px solid var(--color-border)",
              backgroundColor: "transparent",
              color: "var(--color-text)",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t("cancelDelete")}
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="btn-tap"
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "var(--radius-clay)",
              border: "none",
              backgroundColor: "var(--color-red)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: deleting ? "not-allowed" : "pointer",
              opacity: deleting ? 0.6 : 1,
            }}
          >
            {deleting ? t("deleting") : t("confirmDelete")}
          </button>
        </div>
      </div>
    </div>
  );
}
