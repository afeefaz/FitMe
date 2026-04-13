import type { ExerciseDBItem } from "../types.ts";

const EXERCISEDB_BASE = "https://exercisedb-api-navy.vercel.app/api/v1";

export const MUSCLE_GROUP_MAP: Record<string, string> = {
  chest: "pectorals",
  back: "lats",
  shoulders: "deltoids",
  legs: "quads",
  arms: "biceps",
  core: "abs",
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

type ExerciseDBResponse = {
  data: ExerciseDBItem[];
};

export async function fetchExercisesByMuscle(
  muscle: string,
  limit = 20,
  skip = 0
): Promise<ExerciseDBItem[]> {
  const apiMuscle = MUSCLE_GROUP_MAP[muscle.toLowerCase()] ?? muscle;
  const expectedBodyPart = MUSCLE_TO_BODY_PART[apiMuscle];

  const allMatching: ExerciseDBItem[] = [];
  let apiOffset = 0;
  const batchSize = 100;
  const maxBatches = 15;
  const need = skip + limit;

  for (let i = 0; i < maxBatches && allMatching.length < need; i++) {
    const url = `${EXERCISEDB_BASE}/exercises?offset=${apiOffset}&limit=${batchSize}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`ExerciseDB fetch failed: ${res.status}`);

    const json: ExerciseDBResponse = await res.json();
    const batch = json.data ?? [];
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
        allMatching.push(ex);
        if (allMatching.length >= need) break;
      }
    }

    if (batch.length < batchSize) break;
    apiOffset += batchSize;
  }

  return allMatching.slice(skip, skip + limit);
}
