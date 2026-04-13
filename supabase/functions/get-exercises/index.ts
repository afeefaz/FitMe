import { z } from "npm:zod";
import { createAdminClient } from "../_shared/clients.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { requireAuthenticatedUser } from "../_shared/auth.ts";
import { fetchExercisesByMuscle, MUSCLE_GROUP_MAP } from "../_shared/exercises.ts";
import type { ExerciseCache, ExerciseDBItem } from "../types.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const auth = await requireAuthenticatedUser(req);
  if ("error" in auth) return json({ error: auth.error }, auth.status);

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    muscle: url.searchParams.get("muscle"),
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
  });

  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "Invalid parameters" }, 400);
  }

  const { muscle, limit, offset } = parsed.data;
  const apiMuscle = MUSCLE_GROUP_MAP[muscle] ?? muscle;
  const admin = createAdminClient();

  try {
    const exercises = await fetchExercisesByMuscle(muscle, limit, offset);
    if (exercises.length > 0) {
      void cacheExercises(admin, exercises);
      return json({ data: exercises, source: "api" });
    }
  } catch {
    // Fall through to cached rows.
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cached, error: cacheError } = (await (admin as any)
    .from("exercise_cache")
    .select("*")
    .contains("target_muscles", [apiMuscle])
    .range(offset, offset + limit - 1)) as {
    data: ExerciseCache[] | null;
    error: unknown;
  };

  if (cacheError || !cached || cached.length === 0) {
    return json({ error: "Couldn't load exercises. Please try again." }, 503);
  }

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

  return json({ data: mapped, source: "cache" });
});

async function cacheExercises(admin: ReturnType<typeof createAdminClient>, exercises: ExerciseDBItem[]) {
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
  await (admin as any).from("exercise_cache").upsert(rows, { onConflict: "exercise_id" });
}
