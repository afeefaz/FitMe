import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { fetchExercisesByMuscle, MUSCLE_GROUP_MAP } from "@/lib/exercises";
import type { ExerciseDBItem, ExerciseCache } from "@/lib/types";

const querySchema = z.object({
  muscle: z
    .string()
    .min(1)
    .transform((v) => v.toLowerCase())
    .refine((v) => Object.keys(MUSCLE_GROUP_MAP).includes(v), {
      message: "Invalid muscle group",
    }),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: NextRequest) {
  // Auth check — only authenticated users can query exercises
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const parsed = querySchema.safeParse({
    muscle: searchParams.get("muscle"),
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid parameters" },
      { status: 400 }
    );
  }

  const { muscle, limit, offset } = parsed.data;
  const apiMuscle = MUSCLE_GROUP_MAP[muscle] ?? muscle;

  // ── 1. Try ExerciseDB API ─────────────────────────────────────
  try {
    const exercises = await fetchExercisesByMuscle(muscle, limit, offset);

    if (exercises.length > 0) {
      // Cache in background (don't await — don't block the response)
      cacheExercises(exercises).catch(() => {});
      return NextResponse.json({ data: exercises, source: "api" });
    }
  } catch {
    // API failed — fall through to cache
  }

  // ── 2. Fall back to exercise_cache table ─────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cached, error: cacheError } = await (adminClient as any)
    .from("exercise_cache")
    .select("*")
    .contains("target_muscles", [apiMuscle])
    .range(offset, offset + limit - 1) as { data: ExerciseCache[] | null; error: unknown };

  if (cacheError || !cached || cached.length === 0) {
    return NextResponse.json(
      { error: "Couldn't load exercises. Please try again." },
      { status: 503 }
    );
  }

  // Map cache rows back to ExerciseDBItem shape
  const mapped: ExerciseDBItem[] = cached.map((row) => ({
    exerciseId: row.exercise_id,
    name: row.name,
    gifUrl: row.gif_url ?? "",
    targetMuscles: row.target_muscles,
    bodyParts: row.body_parts,
    equipments: row.equipments,
    secondaryMuscles: [],
    instructions: [],
  }));

  return NextResponse.json({ data: mapped, source: "cache" });
}

async function cacheExercises(exercises: ExerciseDBItem[]) {
  const rows = exercises.map((ex) => ({
    exercise_id: ex.exerciseId,
    name: ex.name,
    gif_url: ex.gifUrl,
    target_muscles: ex.targetMuscles,
    body_parts: ex.bodyParts,
    equipments: ex.equipments,
    cached_at: new Date().toISOString(),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from("exercise_cache")
    .upsert(rows, { onConflict: "exercise_id" });
}
