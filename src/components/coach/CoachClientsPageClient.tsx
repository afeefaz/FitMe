"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { ClientsList } from "@/components/coach/ClientsList";
import type { ClientStatus } from "@/lib/types";
import { requireClientRole } from "@/lib/supabase/clientAuth";

interface ClientRow {
  id: string;
  status: ClientStatus;
  trainee: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface CoachClientsPageClientProps {
  locale: string;
}

export function CoachClientsPageClient({ locale }: CoachClientsPageClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [draftClientIds, setDraftClientIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const guard = await requireClientRole({
        role: "coach",
        router,
        locale,
        unauthorizedHref: "/trainee/today",
      });
      if (!guard) {
        return;
      }
      const { supabase, userId } = guard;

      type RawClientRow = {
        id: string;
        status: string;
        trainee: { id: string; full_name: string; email: string } | { id: string; full_name: string; email: string }[] | null;
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientsResult = await (supabase as any)
        .from("clients")
        .select(`
          id,
          status,
          trainee:users!clients_trainee_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq("coach_id", userId)
        .order("created_at", { ascending: false });

      const rawClients = (clientsResult.data ?? []) as RawClientRow[];
      const nextClients: ClientRow[] = rawClients.map((row) => {
        const traineeRow = Array.isArray(row.trainee) ? row.trainee[0] : row.trainee;
        return {
          id: row.id,
          status: row.status as ClientStatus,
          trainee: {
            id: (traineeRow as { id: string })?.id ?? "",
            full_name: (traineeRow as { full_name: string })?.full_name ?? "Unknown",
            email: (traineeRow as { email: string })?.email ?? "",
          },
        };
      });

      const clientIds = nextClients.map((c) => c.id);
      let nextDraftClientIds: string[] = [];
      if (clientIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const draftResult = await (supabase as any)
          .from("plans")
          .select("client_id")
          .eq("is_draft", true)
          .in("client_id", clientIds);
        nextDraftClientIds = ((draftResult.data ?? []) as { client_id: string }[]).map((r) => r.client_id);
      }

      setClients(nextClients);
      setDraftClientIds(nextDraftClientIds);
    } catch (err) {
      setError((err as Error).message || "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, [locale, router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div style={{ padding: "24px 16px" }}>
        <div style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>Loading clients…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "24px 16px" }}>
        <div
          style={{
            padding: "16px",
            borderRadius: "16px",
            border: "1px solid rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.08)",
            color: "#FCA5A5",
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 16px" }}>
      <ClientsList clients={clients} draftClientIds={draftClientIds} onRefresh={load} />
    </div>
  );
}
