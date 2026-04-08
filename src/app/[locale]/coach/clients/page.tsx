import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientsList } from "@/components/coach/ClientsList";
import type { ClientStatus } from "@/lib/types";

interface ClientRow {
  id: string;
  status: ClientStatus;
  trainee: {
    id: string;
    full_name: string;
    email: string;
  };
}

export const dynamic = 'force-dynamic';

export default async function CoachClientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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
    .eq("coach_id", user.id)
    .order("created_at", { ascending: false });

  const rawClients = (clientsResult.data ?? []) as RawClientRow[];

  // Normalize the joined data — Supabase returns the joined row as an object
  const clients: ClientRow[] = rawClients.map((row) => {
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

  // Fetch which clients have a pending draft plan
  const clientIds = clients.map((c) => c.id);
  let draftClientIds = new Set<string>();
  if (clientIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const draftResult = await (supabase as any)
      .from("plans")
      .select("client_id")
      .eq("is_draft", true)
      .in("client_id", clientIds);
    draftClientIds = new Set<string>(
      ((draftResult.data ?? []) as { client_id: string }[]).map((r) => r.client_id)
    );
  }

  return (
    <div style={{ padding: "24px 16px" }}>
      <ClientsList clients={clients} draftClientIds={Array.from(draftClientIds)} />
    </div>
  );
}
