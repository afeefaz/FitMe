import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export default async function CoachDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

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

  const { count: clientCount } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", user!.id);

  return (
    <div style={{ padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px", marginBottom: "4px" }}>
          {t("greeting")}
        </p>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 800,
            color: "var(--color-text)",
            letterSpacing: "-0.02em",
          }}
        >
          {profile?.full_name ?? tc("coachDefault")}
        </h1>
      </div>

      {/* Stats card */}
      <div
        className="card-clay"
        style={{
          padding: "20px",
          marginBottom: "20px",
          animation: "var(--animate-slide-up)",
        }}
      >
        <p style={{ color: "var(--color-text-muted)", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
          {t("totalClients")}
        </p>
        <p
          style={{
            fontSize: "48px",
            fontWeight: 800,
            color: "var(--color-lime)",
            lineHeight: 1,
          }}
        >
          {clientCount ?? 0}
        </p>
      </div>

      {/* Quick actions */}
      <div style={{ marginTop: "8px" }}>
        <a
          href="/coach/clients"
          className="card-clay btn-tap"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 20px",
            textDecoration: "none",
            animation: "var(--animate-slide-up)",
            animationDelay: "0.05s",
          }}
        >
          <div>
            <p style={{ color: "var(--color-text)", fontWeight: 700, fontSize: "16px" }}>
              {t("viewClients")}
            </p>
            <p style={{ color: "var(--color-text-muted)", fontSize: "13px", marginTop: "2px" }}>
              {t("managePlans")}
            </p>
          </div>
          <span style={{ color: "var(--color-lime)", fontSize: "20px" }}>→</span>
        </a>
      </div>
    </div>
  );
}
