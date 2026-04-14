"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { TemplatePlanBuilder } from "@/components/coach/TemplatePlanBuilder";
import { requireClientRole } from "@/lib/supabase/clientAuth";

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

interface CoachTemplatePlanBuilderPageClientProps {
  templateId: string;
}

type ViewModel = {
  isNew: boolean;
  existingTemplate: { id: string; name: string; description: string; difficulty: string } | null;
  existingDays: {
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
  }[];
};

export function CoachTemplatePlanBuilderPageClient({ templateId }: CoachTemplatePlanBuilderPageClientProps) {
  const t = useTranslations("coach.plans");
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vm, setVm] = useState<ViewModel | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const guard = await requireClientRole({ role: "coach", router });
        if (!guard) {
          return;
        }
        const { supabase, userId } = guard;

        const isNew = templateId === "new";
        let existingTemplate: { id: string; name: string; description: string; difficulty: string } | null = null;
        let existingDays: ViewModel["existingDays"] = [];

        if (!isNew) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: template } = await (supabase as any)
            .from("plan_templates")
            .select("id, name, description, difficulty")
            .eq("id", templateId)
            .eq("coach_id", userId)
            .single();

          if (!template) {
            router.replace("/coach/plans");
            return;
          }

          existingTemplate = template as { id: string; name: string; description: string; difficulty: string };

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

          existingDays = ((rawDays ?? []) as RawTemplateDay[]).map((day) => ({
            dbId: day.id,
            dayNumber: day.day_number,
            dayName: day.day_name,
            exercises: (day.plan_template_exercises ?? [])
              .sort((a, b) => a.order_index - b.order_index)
              .map((exercise) => ({
                exercise: {
                  exerciseId: exercise.exercise_id,
                  name: exercise.exercise_name,
                  gifUrl: exercise.gif_url ?? "",
                  targetMuscles: exercise.target_muscles ?? [],
                  bodyParts: exercise.muscle_group ? [exercise.muscle_group] : [],
                  equipments: [],
                  secondaryMuscles: [],
                  instructions: [],
                },
                sets: exercise.sets,
                reps: exercise.reps,
                restSeconds: exercise.rest_seconds,
                notes: exercise.notes ?? "",
              })),
          }));
        }

        if (cancelled) return;
        setVm({ isNew, existingTemplate, existingDays });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load template");
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
  }, [templateId, router]);

  if (loading || !vm) {
    return (
      <div style={{ padding: "24px 16px" }}>
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>Loading template...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "24px 16px" }}>
        <div className="card-clay" style={{ padding: "18px" }}>
          <p style={{ color: "var(--color-red)", fontSize: "14px", fontWeight: 600 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 16px" }}>
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
          {vm.isNew ? t("createTitle") : t("editTitle")}
        </h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "4px", fontSize: "15px" }}>
          {vm.isNew ? t("createSubtitle") : t("editSubtitle")}
        </p>
      </div>

      <TemplatePlanBuilder
        templateId={vm.isNew ? undefined : vm.existingTemplate?.id}
        existingName={vm.existingTemplate?.name}
        existingDescription={vm.existingTemplate?.description}
        existingDifficulty={vm.existingTemplate?.difficulty as "beginner" | "intermediate" | "advanced" | undefined}
        existingDays={vm.existingDays}
      />
    </div>
  );
}