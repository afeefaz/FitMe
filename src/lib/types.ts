// ─── Supabase Database Types ──────────────────────────────────────────────────
// Shared TypeScript types derived from the Supabase schema.

export type UserRole = "coach" | "trainee";
export type ClientStatus = "active" | "needs_plan";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  created_at: string;
  height_cm?: number | null;
  weight_kg?: number | null;
  date_of_birth?: string | null;
}

export interface Client {
  id: string;
  coach_id: string;
  trainee_id: string;
  status: ClientStatus;
  created_at: string;
  // Joined fields
  trainee?: User;
  coach?: User;
}

export interface Plan {
  id: string;
  client_id: string;
  name: string;
  created_at: string;
  is_draft: boolean;
  days?: PlanDay[];
}

export interface PlanDay {
  id: string;
  plan_id: string;
  day_number: number;
  day_name: string;
  exercises?: PlanExercise[];
}

export interface PlanExercise {
  id: string;
  plan_id: string;
  plan_day_id: string;
  exercise_id: string;
  exercise_name: string;
  gif_url: string | null;
  muscle_group: string | null;
  target_muscles: string[];
  order_index: number;
  sets: number;
  reps: number;
  rest_seconds: number;
}

export interface WaterLog {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at: string;
  logged_date: string;
}

export interface WorkoutLog {
  id: string;
  plan_id: string;
  trainee_id: string;
  completed_at: string | null;
  notified: boolean;
  created_at: string;
}

export interface SetLog {
  id: string;
  workout_log_id: string;
  exercise_id: string;
  reps: number;
  weight: number | null;
  logged_at: string;
}

export interface ExerciseCache {
  exercise_id: string;
  name: string;
  gif_url: string | null;
  target_muscles: string[];
  body_parts: string[];
  equipments: string[];
  cached_at: string;
}

// ─── ExerciseDB API Types ─────────────────────────────────────────────────────
export interface ExerciseDBItem {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

export interface ExerciseDBResponse {
  success: boolean;
  data: ExerciseDBItem[];
  metadata: {
    totalPages: number;
    totalExercises: number;
    currentPage: number;
  };
}

// ─── Database generic helper type ────────────────────────────────────────────
export type Database = {
  public: {
    Tables: {
      users: { Row: User };
      clients: { Row: Client };
      plans: { Row: Plan };
      plan_exercises: { Row: PlanExercise };
      workout_logs: { Row: WorkoutLog };
      set_logs: { Row: SetLog };
      exercise_cache: { Row: ExerciseCache };
    };
  };
};
