import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoachDashboardPageClient } from "@/components/coach/CoachDashboardPageClient";

const isGithubPages = process.env.GITHUB_PAGES === "true";

type Props = { params: Promise<{ locale: string }> };

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

export default async function CoachDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (isGithubPages) {
    return <CoachDashboardPageClient />;
  }

  const t = await getTranslations("coach.dashboard");
  const tc = await getTranslations("common");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user!.id)
    .single<{ full_name: string }>();

  // Fetch all clients with trainee info
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
    .eq("coach_id", user!.id)
    .order("created_at", { ascending: false });

  // Fetch latest plan name per client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: plans } = await (supabase as any)
    .from("plans")
    .select("client_id, name")
    .in(
      "client_id",
      (rawClients ?? []).map((c: { id: string }) => c.id)
    )
    .eq("is_draft", false)
    .order("created_at", { ascending: false });

  // Latest workout_log per trainee
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lastLogs } = await (supabase as any)
    .from("workout_logs")
    .select("trainee_id, logged_at")
    .in(
      "trainee_id",
      (rawClients ?? []).map((c: { trainee: { id: string } }) => c.trainee?.id).filter(Boolean)
    )
    .order("logged_at", { ascending: false });

  // Recent activity (last 5 across all clients)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recentLogs } = await (supabase as any)
    .from("workout_logs")
    .select("exercise_name, logged_at, trainee_id")
    .in(
      "trainee_id",
      (rawClients ?? []).map((c: { trainee: { id: string } }) => c.trainee?.id).filter(Boolean)
    )
    .order("logged_at", { ascending: false })
    .limit(5);

  // Build latest log map: traineeId → logged_at
  const lastLogMap: Record<string, string> = {};
  for (const log of lastLogs ?? []) {
    if (!lastLogMap[log.trainee_id]) {
      lastLogMap[log.trainee_id] = log.logged_at;
    }
  }

  // Build plan map: clientId → name (first plan, most recent)
  const planMap: Record<string, string> = {};
  for (const p of plans ?? []) {
    if (!planMap[p.client_id]) {
      planMap[p.client_id] = p.name;
    }
  }

  // Build trainee name map for activity feed
  const traineeNameMap: Record<string, string> = {};
  for (const c of rawClients ?? []) {
    if (c.trainee?.id) {
      traineeNameMap[c.trainee.id] = c.trainee.full_name ?? c.trainee.email ?? "Unknown";
    }
  }

  const clients: ClientWithPlan[] = (rawClients ?? []).map((c: {
    id: string;
    status: string;
    trainee: { id: string; full_name: string | null; email: string | null };
  }) => ({
    id: c.id,
    status: c.status,
    trainee: c.trainee,
    plan_name: planMap[c.id] ?? null,
    last_active: c.trainee?.id ? (lastLogMap[c.trainee.id] ?? null) : null,
  }));

  const needsAttention = clients.filter((c) => c.status === "needs_plan");
  const activeClients = clients.filter((c) => c.status !== "needs_plan");

  const activity: ActivityLog[] = (recentLogs ?? []).map((l: {
    exercise_name: string;
    logged_at: string;
    trainee_id: string;
  }) => ({
    exercise_name: l.exercise_name,
    logged_at: l.logged_at,
    trainee_name: traineeNameMap[l.trainee_id] ?? "Unknown",
  }));

  return (
    <div style={{ padding: "24px 16px 8px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px", marginBottom: "4px" }}>
            {t("greeting")}
          </p>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "var(--color-text)",
              letterSpacing: "-0.02em",
            }}
          >
            {profile?.full_name ?? tc("coachDefault")}
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

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <p style={{
            color: "var(--color-amber)",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            marginBottom: "10px",
          }}>
            {t("needsAttention")} ({needsAttention.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {needsAttention.map((c) => (
              <Link
                key={c.id}
                href={`/coach/clients/${c.id}/plan` as `/coach/${string}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  className="card-clay btn-tap"
                  style={{
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderLeft: "3px solid var(--color-amber)",
                  }}
                >
                  <div>
                    <p style={{ color: "var(--color-text)", fontWeight: 700, fontSize: "15px" }}>
                      {c.trainee.full_name ?? c.trainee.email ?? "Unknown"}
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

      {/* All active clients */}
      {activeClients.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <p style={{
            color: "var(--color-text-muted)",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            marginBottom: "10px",
          }}>
            {t("allClients")} ({activeClients.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {activeClients.map((c) => {
              const daysAgo = c.last_active ? getDaysAgo(c.last_active) : null;
              return (
                <Link
                  key={c.id}
                  href={`/coach/clients/${c.id}/plan` as `/coach/${string}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    className="card-clay btn-tap"
                    style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "var(--color-text)", fontWeight: 700, fontSize: "15px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.trainee.full_name ?? c.trainee.email ?? "Unknown"}
                      </p>
                      <p style={{ color: "var(--color-text-muted)", fontSize: "12px", marginTop: "2px" }}>
                        {c.plan_name ?? t("noPlan")}
                      </p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "12px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: "20px",
                          backgroundColor: daysAgo !== null && daysAgo <= 3
                            ? "rgba(204,255,0,0.12)"
                            : "rgba(255,255,255,0.06)",
                          color: daysAgo !== null && daysAgo <= 3
                            ? "var(--color-lime)"
                            : "var(--color-text-muted)",
                        }}
                      >
                        {c.last_active ? formatRelativeTime(c.last_active) : t("never")}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Show needsAttention in allClients if no active */}
      {activeClients.length === 0 && needsAttention.length === 0 && (
        <div
          className="card-clay"
          style={{ padding: "28px 20px", textAlign: "center", marginBottom: "24px" }}
        >
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>No clients yet.</p>
          <Link
            href="/coach/clients"
            style={{
              display: "inline-block",
              marginTop: "12px",
              color: "var(--color-lime)",
              fontWeight: 700,
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            {t("addNewClient")}
          </Link>
        </div>
      )}

      {/* Recent Activity */}
      <div style={{ marginBottom: "24px" }}>
        <p style={{
          color: "var(--color-text-muted)",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          marginBottom: "10px",
        }}>
          {t("recentActivity")}
        </p>
        {activity.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>
            {t("noRecentActivity")}
          </p>
        ) : (
          <div className="card-clay" style={{ overflow: "hidden" }}>
            {activity.map((a, idx) => (
              <div
                key={idx}
                style={{
                  padding: "12px 16px",
                  borderBottom: idx < activity.length - 1 ? "1px solid var(--color-border)" : undefined,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p style={{ color: "var(--color-text)", fontWeight: 600, fontSize: "13px" }}>
                    {a.exercise_name}
                  </p>
                  <p style={{ color: "var(--color-text-muted)", fontSize: "12px", marginTop: "1px" }}>
                    {a.trainee_name}
                  </p>
                </div>
                <span style={{ color: "var(--color-text-muted)", fontSize: "11px" }}>
                  {formatRelativeTime(a.logged_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <Link
          href="/coach/workouts"
          className="card-clay btn-tap"
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "14px",
            textDecoration: "none",
            color: "var(--color-text)",
            fontWeight: 600,
            fontSize: "13px",
            textAlign: "center",
          }}
        >
          🏋️ {t("browseExercises")}
        </Link>
        <Link
          href="/coach/clients"
          className="card-clay btn-tap"
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "14px",
            textDecoration: "none",
            color: "var(--color-text)",
            fontWeight: 600,
            fontSize: "13px",
            textAlign: "center",
          }}
        >
          👥 {t("viewClients")}
        </Link>
      </div>
    </div>
  );
}
