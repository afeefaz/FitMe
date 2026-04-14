import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GithubPagesAuthGate } from "@/components/ui/GithubPagesAuthGate";
import { TraineePlansPageClient } from "@/components/trainee/TraineePlansPageClient";

const isGithubPages = process.env.GITHUB_PAGES === "true";


type Props = { params: Promise<{ locale: string }> };

export default async function TraineePlansPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (isGithubPages) {
    return <TraineePlansPageClient />;
  }

  const t = await getTranslations("trainee.plans");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: clientRow } = await (supabase as any)
    .from("clients")
    .select(`
      plans (
        id,
        name,
        is_draft,
        created_at,
        plan_days (
          id,
          plan_exercises ( id )
        )
      )
    `)
    .eq("trainee_id", user!.id)
    .maybeSingle();

  const plansRaw = clientRow?.plans;
  const plansArr: Array<{
    id: string;
    name: string;
    is_draft: boolean;
    created_at: string;
    plan_days: Array<{ id: string; plan_exercises: Array<{ id: string }> }> | null;
  }> = plansRaw
    ? Array.isArray(plansRaw)
      ? plansRaw
      : [plansRaw]
    : [];

  const plans = plansArr
    .filter((p) => !p.is_draft)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((p) => {
      const days = p.plan_days ?? [];
      let exerciseCount = 0;
      for (const d of days) exerciseCount += (d.plan_exercises ?? []).length;
      return { id: p.id, name: p.name, dayCount: days.length, exerciseCount, createdAt: p.created_at };
    });

  const MUSCLE_ICONS = ["🏋️", "💪", "🦵", "🔥", "⚡", "🏃"];

  return (
    <div style={{ padding: "24px 16px 32px" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--color-text)", marginBottom: "4px" }}>
        {t("title")}
      </h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: "14px", marginBottom: "28px" }}>
        {t("subtitle")}
      </p>

      {plans.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: "60px" }}>
          <div style={{ fontSize: "56px", marginBottom: "16px" }}>📋</div>
          <p style={{ fontSize: "17px", fontWeight: 700, color: "var(--color-text)", marginBottom: "8px" }}>
            {t("noPlans")}
          </p>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px", maxWidth: "260px", margin: "0 auto" }}>
            {t("noPlansHint")}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {plans.map((plan, idx) => (
            <Link
              key={plan.id}
              href={`/trainee/plans/${plan.id}`}
              style={{ textDecoration: "none" }}
            >
              <div
                className="card-clay btn-tap"
                style={{
                  padding: "20px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                {/* Icon circle */}
                <div style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "16px",
                  backgroundColor: idx === 0 ? "rgba(204,255,0,0.12)" : "var(--color-bg)",
                  border: `1.5px solid ${idx === 0 ? "rgba(204,255,0,0.3)" : "var(--color-border)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  flexShrink: 0,
                }}>
                  {MUSCLE_ICONS[idx % MUSCLE_ICONS.length]}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--color-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {plan.name}
                    </h2>
                    {idx === 0 && (
                      <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "100px", backgroundColor: "var(--color-lime)", color: "#000", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {t("activePlan")}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    {plan.dayCount > 0 && (
                      <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                        📅 {t("days", { count: plan.dayCount })}
                      </span>
                    )}
                    {plan.exerciseCount > 0 && (
                      <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                        🏃 {t("exercises", { count: plan.exerciseCount })}
                      </span>
                    )}
                  </div>
                </div>

                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
