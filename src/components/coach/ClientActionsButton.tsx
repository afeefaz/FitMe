"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ClientActionsSheet } from "@/components/coach/ClientActionsSheet";

interface ClientActionsButtonProps {
  clientId: string;
  traineeId: string;
  traineeName: string;
}

export function ClientActionsButton({ clientId, traineeId, traineeName }: ClientActionsButtonProps) {
  const t = useTranslations("coach.actions");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-tap"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 14px",
          borderRadius: "100px",
          border: "1.5px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
          color: "var(--color-text-muted)",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
        </svg>
        {t("title")}
      </button>

      {open && (
        <ClientActionsSheet
          clientId={clientId}
          traineeId={traineeId}
          traineeName={traineeName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
