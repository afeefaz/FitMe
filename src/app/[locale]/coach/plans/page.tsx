import { createClient } from "@/lib/supabase/server";
import { redirect, Link } from "@/i18n/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

type PlanTemplate = {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  updated_at: string;
  day_count: number;
  exercise_count: number;
};

function formatRelativeTime(dateStr: string): string {
  const then = new Date(dateStr);
  const now = new Date();
  const days = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const difficultyColors: Record<string, { bg: string; color: string }> = {
  beginner: { bg: "rgba(34,197,94,0.12)", color: "#22c55e" },
  intermediate: { bg: "rgba(204,255,0,0.12)", color: "var(--color-lime)" },
  advanced: { bg: "rgba(239,68,68,0.12)", color: "var(--color-red)" },
};

export default async function CoachPlansPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("coach.plans");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  // Fetch all plan templates for this coach
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawTemplates } = await (supabase as any)
    .from("plan_templates")
    .select(`
      id,
      name,
      description,
      difficulty,
      updated_at,
      plan_template_days (
        id,
        plan_template_exercises ( id )
      )
    `)
    .eq("coach_id", user!.id)
    .order("updated_at", { ascending: false });

  const templates: PlanTemplate[] = (rawTemplates ?? []).map((t: {
    id: string;
    name: string;
    description: string;
    difficulty: string;
    updated_at: string;
    plan_template_days: { id: string; plan_template_exercises: { id: string }[] }[];
  }) => {
    const days = t.plan_template_days ?? [];
    const exerciseCount = days.reduce((sum, d) => sum + (d.plan_template_exercises?.length ?? 0), 0);
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      difficulty: t.difficulty,
      updated_at: t.updated_at,
      day_count: days.length,
      exercise_count: exerciseCount,
    };
  });

  return (
    <div style={{ padding: "24px 16px 8px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "var(--color-text)",
              letterSpacing: "-0.02em",
            }}
          >
            {t("title")}
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px", marginTop: "4px" }}>
            {t("subtitle")}
          </p>
        </div>
        <Link
          href={"/coach/plans/new" as `/coach/${string}`}
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
          {t("createPlan")}
        </Link>
      </div>

      {/* Plan Templates List */}
      {templates.length === 0 ? (
        <div
          className="card-clay"
          style={{ padding: "40px 20px", textAlign: "center" }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
          <p style={{ color: "var(--color-text)", fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>
            {t("emptyTitle")}
          </p>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px", marginBottom: "20px", lineHeight: 1.5 }}>
            {t("emptyHint")}
          </p>
          <Link
            href={"/coach/plans/new" as `/coach/${string}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "var(--color-lime)",
              color: "#000",
              fontWeight: 700,
              fontSize: "14px",
              padding: "12px 20px",
              borderRadius: "var(--radius-clay)",
              textDecoration: "none",
            }}
          >
            {t("createFirstPlan")}
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <p style={{
            color: "var(--color-text-muted)",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            marginBottom: "2px",
          }}>
            {t("allPlans")} ({templates.length})
          </p>
          {templates.map((template, idx) => {
            const dc = difficultyColors[template.difficulty] ?? difficultyColors.intermediate;
            return (
              <Link
                key={template.id}
                href={`/coach/plans/${template.id}` as `/coach/${string}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  className="card-clay btn-tap"
                  style={{
                    padding: "16px",
                    animation: "slide-up 0.25s ease both",
                    animationDelay: `${idx * 50}ms`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        color: "var(--color-text)",
                        fontWeight: 700,
                        fontSize: "16px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {template.name}
                      </p>
                      {template.description && (
                        <p style={{
                          color: "var(--color-text-muted)",
                          fontSize: "13px",
                          marginTop: "4px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {template.description}
                        </p>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: "100px",
                        backgroundColor: dc.bg,
                        color: dc.color,
                        textTransform: "capitalize",
                        flexShrink: 0,
                        marginLeft: "12px",
                      }}
                    >
                      {t(`difficulty.${template.difficulty}`)}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                      📅 {template.day_count} {template.day_count === 1 ? t("dayWord") : t("daysWord")}
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                      🏋️ {template.exercise_count} {template.exercise_count === 1 ? t("exerciseWord") : t("exercisesWord")}
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--color-text-dim)", marginLeft: "auto" }}>
                      {formatRelativeTime(template.updated_at)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
