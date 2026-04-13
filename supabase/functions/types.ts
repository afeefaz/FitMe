export type ExerciseDBItem = {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
};

export type ExerciseCache = {
  exercise_id: string;
  name: string;
  gif_url: string | null;
  target_muscles: string[];
  body_parts: string[];
  equipments: string[];
};
