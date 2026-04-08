"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AddClientSheet } from "@/components/coach/AddClientSheet";
import { ClientRow } from "@/components/coach/ClientRow";
import { useNotificationStore } from "@/hooks/useRealtimeNotification";
import { useTranslations } from "next-intl";
import type { ClientStatus } from "@/lib/types";

interface Client {
  id: string;
  status: ClientStatus;
  trainee: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface ClientsListProps {
  clients: Client[];
  draftClientIds?: string[];
}

export function ClientsList({ clients: initialClients, draftClientIds = [] }: ClientsListProps) {
  const t = useTranslations("coach.clients");
  const draftSet = new Set(draftClientIds);
  const router = useRouter();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const clearNotification = useNotificationStore((s) => s.clearNotification);

  // Clear the red dot whenever the coach lands on this page
  useEffect(() => {
    clearNotification();
  }, [clearNotification]);

  function handleSuccess() {
    setShowAddSheet(false);
    router.refresh(); // re-fetch server component data
  }

  return (
    <>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <div>
          <h1
            suppressHydrationWarning
            style={{
              fontSize: "28px",
              fontWeight: 800,
              color: "var(--color-text)",
              letterSpacing: "-0.02em",
            }}
          >
            {t("title")}
          </h1>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "2px" }}>
            {t("total", { count: initialClients.length })}
          </p>
        </div>

        <button
          onClick={() => setShowAddSheet(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 18px",
            borderRadius: "14px",
            background: "var(--color-lime)",
            color: "var(--color-black)",
            fontWeight: 700,
            fontSize: "14px",
            border: "none",
            cursor: "pointer",
            minHeight: "44px",
            boxShadow: "var(--shadow-clay-lime)",
            transition: "transform 0.15s cubic-bezier(0.34,1.56,0.64,1)",
          }}
          onTouchStart={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.95)"; }}
          onTouchEnd={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.95)"; }}
          onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        >
          <span style={{ fontSize: "18px", lineHeight: 1 }}>+</span>
          {t("addClient")}
        </button>
      </div>

      {/* Client list */}
      {initialClients.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            animation: "var(--animate-fade-in)",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>👤</div>
          <p style={{ fontWeight: 700, fontSize: "18px", color: "var(--color-text)", marginBottom: "8px" }}>
            {t("noClients")}
          </p>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
            {t("noClientsHint")}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {initialClients.map((client, i) => (
            <ClientRow
              key={client.id}
              id={client.id}
              full_name={client.trainee.full_name}
              email={client.trainee.email}
              status={client.status}
              hasDraft={draftSet.has(client.id)}
              animationDelay={`${i * 0.04}s`}
            />
          ))}
        </div>
      )}

      {/* Add client bottom sheet */}
      {showAddSheet && (
        <AddClientSheet
          onClose={() => setShowAddSheet(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
