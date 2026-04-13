import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { TemplatePlanBuilder } from "@/components/coach/TemplatePlanBuilder";
import { Link } from "@/i18n/navigation";
import { GithubPagesAuthGate } from "@/components/ui/GithubPagesAuthGate";
import { routing } from "@/i18n/routing";

const isGithubPages = process.env.GITHUB_PAGES === "true";


interface PageProps {
  params: Promise<{ templateId: string; locale: string }>;
}

type RawTemplateExercise = {
  id: string;
  exercise_id: string;
  exercise_name: string;
  gif_url: string | null;
  target_muscles: string[];
  muscle_group: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  notes: string;
  order_index: number;
};

type RawTemplateDay = {
  id: string;
  day_number: number;
  day_name: string;
  plan_template_exercises: RawTemplateExercise[];
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale, templateId: "placeholder" }));
}

export default async function TemplatePlanBuilderPage({ params }: PageProps) {
  const { templateId, locale } = await params;
  setRequestLocale(locale);

  if (isGithubPages) {
    return <GithubPagesAuthGate locale={locale} mode="coach" />;
  }

  const t = await getTranslations("coach.plans");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  const isNew = templateId === "new";

  let existingTemplate: { id: string; name: string; description: string; difficulty: string } | null = null;
  let existingDays: {
    dbId: string;
    dayNumber: number;
    dayName: string;
    exercises: {
      exercise: {
        exerciseId: string;
        name: string;
        gifUrl: string;
        targetMuscles: string[];
        bodyParts: string[];
        equipments: string[];
        secondaryMuscles: string[];
        instructions: string[];
      };
      sets: number;
      reps: number;
      restSeconds: number;
      notes: string;
    }[];
  }[] = [];

  if (!isNew) {
    // Load existing template
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: template } = await (supabase as any)
      .from("plan_templates")
      .select("id, name, description, difficulty")
      .eq("id", templateId)
      .eq("coach_id", user!.id)
      .single();

    if (!template) {
      redirect({ href: "/coach/plans", locale });
      return null;
    }

    existingTemplate = template as { id: string; name: string; description: string; difficulty: string };

    // Load days with exercises
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawDays } = await (supabase as any)
      .from("plan_template_days")
      .select(`
        id,
        day_number,
        day_name,
        plan_template_exercises (
          id,
          exercise_id,
          exercise_name,
          gif_url,
          target_muscles,
          muscle_group,
          sets,
          reps,
          rest_seconds,
          notes,
          order_index
        )
      `)
      .eq("template_id", templateId)
      .order("day_number", { ascending: true });

    existingDays = ((rawDays ?? []) as RawTemplateDay[]).map((d) => ({
      dbId: d.id,
      dayNumber: d.day_number,
      dayName: d.day_name,
      exercises: (d.plan_template_exercises ?? [])
        .sort((a, b) => a.order_index - b.order_index)
        .map((ex) => ({
          exercise: {
            exerciseId: ex.exercise_id,
            name: ex.exercise_name,
            gifUrl: ex.gif_url ?? "",
            targetMuscles: ex.target_muscles ?? [],
            bodyParts: ex.muscle_group ? [ex.muscle_group] : [],
            equipments: [],
            secondaryMuscles: [],
            instructions: [],
          },
          sets: ex.sets,
          reps: ex.reps,
          restSeconds: ex.rest_seconds,
          notes: ex.notes ?? "",
        })),
    }));
  }

  return (
    <div style={{ padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <Link
            href="/coach/plans"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--color-text-muted)",
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {t("title")}
          </Link>
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--color-text)", lineHeight: 1.2 }}>
          {isNew ? t("createTitle") : t("editTitle")}
        </h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "4px", fontSize: "15px" }}>
          {isNew ? t("createSubtitle") : t("editSubtitle")}
        </p>
      </div>

      <TemplatePlanBuilder
        templateId={isNew ? undefined : existingTemplate?.id}
        existingName={existingTemplate?.name}
        existingDescription={existingTemplate?.description}
        existingDifficulty={existingTemplate?.difficulty as "beginner" | "intermediate" | "advanced" | undefined}
        existingDays={existingDays}
      />
    </div>
  );
}
