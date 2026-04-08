import type { ExerciseDBItem, ExerciseDBResponse } from "@/lib/types";

const EXERCISEDB_BASE = "https://exercisedb-api-navy.vercel.app/api/v1";

// Maps user-friendly muscle group names to ExerciseDB API-valid targetMuscle names
export const MUSCLE_GROUP_MAP: Record<string, string> = {
  chest: "pectorals",
  back: "lats",
  shoulders: "deltoids",
  legs: "quads",
  arms: "biceps",
  core: "abs",
  // Aliases for direct use
  pectorals: "pectorals",
  lats: "lats",
  deltoids: "deltoids",
  quads: "quads",
  biceps: "biceps",
  abs: "abs",
  hamstrings: "hamstrings",
  glutes: "glutes",
  triceps: "triceps",
  calves: "calves",
};

// Maps ExerciseDB targetMuscle names to their bodyPart category
// Used to broaden the filter when targetMuscle alone is too narrow
const MUSCLE_TO_BODY_PART: Record<string, string> = {
  pectorals: "chest",
  lats: "back",
  "upper back": "back",
  deltoids: "shoulders",
  quads: "upper legs",
  hamstrings: "upper legs",
  glutes: "upper legs",
  biceps: "upper arms",
  "biceps brachii": "upper arms",
  triceps: "upper arms",
  abs: "waist",
  calves: "lower legs",
};

export const SMART_GENERATOR_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "legs",
  "arms",
  "core",
] as const;

export type MuscleGroup = (typeof SMART_GENERATOR_GROUPS)[number];

export async function fetchExercisesByMuscle(
  muscle: string,
  limit = 10
): Promise<ExerciseDBItem[]> {
  const apiMuscle = MUSCLE_GROUP_MAP[muscle.toLowerCase()] ?? muscle;
  const expectedBodyPart = MUSCLE_TO_BODY_PART[apiMuscle];

  // The ExerciseDB API at this endpoint ignores filter query params and returns
  // all exercises sorted by targetMuscles DESC (alphabetically — "upper back"
  // first, "abs" last). We fetch pages of 100 and filter client-side until we
  // have enough matching exercises. Next.js caches each page for 1 hour, so
  // subsequent calls to different muscle groups that share a cached page are free.
  const results: ExerciseDBItem[] = [];
  let offset = 0;
  const batchSize = 100; // max allowed by the API
  const maxBatches = 15; // sample up to 1500 exercises

  for (let i = 0; i < maxBatches && results.length < limit; i++) {
    const url = `${EXERCISEDB_BASE}/exercises?offset=${offset}&limit=${batchSize}`;
    const res = await fetch(url, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`ExerciseDB fetch failed: ${res.status}`);

    const json: ExerciseDBResponse = await res.json();
    const batch: ExerciseDBItem[] = json.data ?? [];
    if (batch.length === 0) break;

    for (const ex of batch) {
      const matchesTarget = ex.targetMuscles?.some(
        (m) => m.toLowerCase() === apiMuscle.toLowerCase()
      );
      const matchesBodyPart =
        expectedBodyPart &&
        ex.bodyParts?.some(
          (bp) => bp.toLowerCase() === expectedBodyPart.toLowerCase()
        );
      if (matchesTarget || matchesBodyPart) {
        results.push(ex);
        if (results.length >= limit) break;
      }
    }

    if (batch.length < batchSize) break; // no more pages
    offset += batchSize;
  }

  return results.slice(0, limit);
}
