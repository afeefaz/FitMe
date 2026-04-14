"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { requireClientRole } from "@/lib/supabase/clientAuth";

type ClientWithPlan = {
  id: string;
  status: string;
  trainee: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
  plan_name: string | null;
  last_active: string | null;
};

type ActivityLog = {
  exercise_name: string;
  logged_at: string;
  trainee_name: string;
};

function getDaysAgo(dateStr: string): number {
  const then = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

function formatRelativeTime(dateStr: string): string {
  const days = getDaysAgo(dateStr);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export function CoachDashboardPageClient() {
  const t = useTranslations("coach.dashboard");
  const tc = useTranslations("common");
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coachName, setCoachName] = useState<string>(tc("coachDefault"));
  const [clients, setClients] = useState<ClientWithPlan[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const guard = await requireClientRole({ role: "coach", router });
        if (!guard) {
          return;
        }
        const { supabase, userId } = guard;

        const { data: profile } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", userId)
          .single<{ full_name: string | null }>();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rawClients } = await (supabase as any)
          .from("clients")
          .select(`
            id,
            status,
            trainee:trainee_id (
              id,
              full_name,
              email
            )
          `)
          .eq("coach_id", userId)
          .order("created_at", { ascending: false });

        const clientIds = (rawClients ?? []).map((c: { id: string }) => c.id);
        const traineeIds = (rawClients ?? [])
          .map((c: { trainee: { id: string } }) => c.trainee?.id)
          .filter(Boolean);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: plans } = clientIds.length > 0
          ? await (supabase as any)
            .from("plans")
            .select("client_id, name")
            .in("client_id", clientIds)
            .eq("is_draft", false)
            .order("created_at", { ascending: false })
          : { data: [] };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: lastLogs } = traineeIds.length > 0
          ? await (supabase as any)
            .from("workout_logs")
            .select("trainee_id, logged_at")
            .in("trainee_id", traineeIds)
            .order("logged_at", { ascending: false })
          : { data: [] };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: recentLogs } = traineeIds.length > 0
          ? await (supabase as any)
            .from("workout_logs")
            .select("exercise_name, logged_at, trainee_id")
            .in("trainee_id", traineeIds)
            .order("logged_at", { ascending: false })
            .limit(5)
          : { data: [] };

        const lastLogMap: Record<string, string> = {};
        for (const log of lastLogs ?? []) {
          if (!lastLogMap[log.trainee_id]) {
            lastLogMap[log.trainee_id] = log.logged_at;
          }
        }

        const planMap: Record<string, string> = {};
        for (const plan of plans ?? []) {
          if (!planMap[plan.client_id]) {
            planMap[plan.client_id] = plan.name;
          }
        }

        const traineeNameMap: Record<string, string> = {};
        for (const client of rawClients ?? []) {
          if (client.trainee?.id) {
            traineeNameMap[client.trainee.id] = client.trainee.full_name ?? client.trainee.email ?? "Unknown";
          }
        }

        const nextClients: ClientWithPlan[] = (rawClients ?? []).map((client: {
          id: string;
          status: string;
          trainee: { id: string; full_name: string | null; email: string | null };
        }) => ({
          id: client.id,
          status: client.status,
          trainee: client.trainee,
          plan_name: planMap[client.id] ?? null,
          last_active: client.trainee?.id ? (lastLogMap[client.trainee.id] ?? null) : null,
        }));

        const nextActivity: ActivityLog[] = (recentLogs ?? []).map((log: {
          exercise_name: string;
          logged_at: string;
          trainee_id: string;
        }) => ({
          exercise_name: log.exercise_name,
          logged_at: log.logged_at,
          trainee_name: traineeNameMap[log.trainee_id] ?? "Unknown",
        }));

        if (cancelled) return;
        setCoachName(profile?.full_name ?? tc("coachDefault"));
        setClients(nextClients);
        setActivity(nextActivity);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [router, tc]);

  const needsAttention = clients.filter((client) => client.status === "needs_plan");
  const activeClients = clients.filter((client) => client.status !== "needs_plan");

  return (
    <div style={{ padding: "24px 16px 8px" }}>
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px", marginBottom: "4px" }}>
            {t("greeting")}
          </p>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
            {coachName}
          </h1>
        </div>
        <Link
          href="/coach/clients"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "var(--color-lime)",
            color: "#000",
            fontWeight: 700,
            fontSize: "13px",
            padding: "8px 14px",
            borderRadius: "var(--radius-clay)",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          {t("addNewClient")}
        </Link>
      </div>

      {loading && (
        <div className="card-clay" style={{ padding: "20px", marginBottom: "24px" }}>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>Loading dashboard...</p>
        </div>
      )}

      {error && !loading && (
        <div className="card-clay" style={{ padding: "20px", marginBottom: "24px", borderColor: "var(--color-red)" }}>
          <p style={{ color: "var(--color-red)", fontSize: "14px", fontWeight: 600 }}>{error}</p>
        </div>
      )}

      {!loading && !error && needsAttention.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <p style={{ color: "var(--color-amber)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "10px" }}>
            {t("needsAttention")} ({needsAttention.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {needsAttention.map((client) => (
              <Link key={client.id} href={`/coach/clients/${client.id}/plan`} style={{ textDecoration: "none" }}>
                <div className="card-clay btn-tap" style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderLeft: "3px solid var(--color-amber)" }}>
                  <div>
                    <p style={{ color: "var(--color-text)", fontWeight: 700, fontSize: "15px" }}>
                      {client.trainee.full_name ?? client.trainee.email ?? "Unknown"}
                    </p>
                    <p style={{ color: "var(--color-amber)", fontSize: "12px", marginTop: "2px" }}>
                      {t("needsPlan")}
                    </p>
                  </div>
                  <span style={{ color: "var(--color-lime)", fontSize: "18px" }}>+</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && activeClients.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <p style={{ color: "var(--color-text-muted)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "10px" }}>
            {t("allClients")} ({activeClients.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {activeClients.map((client) => {
              const daysAgo = client.last_active ? getDaysAgo(client.last_active) : null;
              return (
                <Link key={client.id} href={`/coach/clients/${client.id}/plan`} style={{ textDecoration: "none" }}>
                  <div className="card-clay btn-tap" style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "var(--color-text)", fontWeight: 700, fontSize: "15px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {client.trainee.full_name ?? client.trainee.email ?? "Unknown"}
                      </p>
                      <p style={{ color: "var(--color-text-muted)", fontSize: "12px", marginTop: "2px" }}>
                        {client.plan_name ?? t("noPlan")}
                      </p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "12px" }}>
                      <span style={{ display: "inline-block", fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "20px", backgroundColor: daysAgo !== null && daysAgo <= 3 ? "rgba(204,255,0,0.12)" : "rgba(255,255,255,0.06)", color: daysAgo !== null && daysAgo <= 3 ? "var(--color-lime)" : "var(--color-text-muted)" }}>
                        {client.last_active ? formatRelativeTime(client.last_active) : t("never")}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {!loading && !error && activeClients.length === 0 && needsAttention.length === 0 && (
        <div className="card-clay" style={{ padding: "28px 20px", textAlign: "center", marginBottom: "24px" }}>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>No clients yet.</p>
          <Link href="/coach/clients" style={{ display: "inline-block", marginTop: "12px", color: "var(--color-lime)", fontWeight: 700, fontSize: "14px", textDecoration: "none" }}>
            {t("addNewClient")}
          </Link>
        </div>
      )}

      {!loading && !error && (
        <div style={{ marginBottom: "24px" }}>
          <p style={{ color: "var(--color-text-muted)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "10px" }}>
            {t("recentActivity")}
          </p>
          {activity.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>
              {t("noRecentActivity")}
            </p>
          ) : (
            <div className="card-clay" style={{ overflow: "hidden" }}>
              {activity.map((item, index) => (
                <div
                  key={`${item.logged_at}-${index}`}
                  style={{
                    padding: "12px 16px",
                    borderBottom: index < activity.length - 1 ? "1px solid var(--color-border)" : undefined,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <p style={{ color: "var(--color-text)", fontWeight: 600, fontSize: "13px" }}>
                      {item.exercise_name}
                    </p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "12px", marginTop: "1px" }}>
                      {item.trainee_name}
                    </p>
                  </div>
                  <span style={{ color: "var(--color-text-muted)", fontSize: "11px" }}>
                    {formatRelativeTime(item.logged_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
          <Link href="/coach/workouts" className="card-clay btn-tap" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "14px", textDecoration: "none", color: "var(--color-text)", fontWeight: 600, fontSize: "13px", textAlign: "center" }}>
            🏋️ {t("browseExercises")}
          </Link>
          <Link href="/coach/clients" className="card-clay btn-tap" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "14px", textDecoration: "none", color: "var(--color-text)", fontWeight: 600, fontSize: "13px", textAlign: "center" }}>
            👥 {t("viewClients")}
          </Link>
        </div>
      )}
    </div>
  );
}