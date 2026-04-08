"use client";

import { useState } from "react";
import { WorkoutCard } from "@/components/trainee/WorkoutCard";
import { LogSetSheet } from "@/components/trainee/LogSetSheet";
import { RestTimer } from "@/components/ui/RestTimer";
import { ExerciseDetailModal, type ModalExercise } from "@/components/ui/ExerciseDetailModal";
import { useTranslations } from "next-intl";
import { useSetLogs } from "@/hooks/useSetLogs";

interface Exercise {
  exerciseId: string;
  name: string;
  gifUrl: string | null;
  muscleGroup: string | null;
  sets: number;
  reps: number;
  restSeconds: number;
}

interface WorkoutDashboardProps {
  traineeId: string;
  planId: string;
  planName: string;
  exercises: Exercise[];
  hideHeader?: boolean;
}

export function WorkoutDashboard({ traineeId, planId, planName, exercises, hideHeader }: WorkoutDashboardProps) {
  const t = useTranslations("trainee.workouts");
  const { counts: setsLogged, increment } = useSetLogs(traineeId, planId);
  const [activeSheet, setActiveSheet] = useState<Exercise | null>(null);
  const [showTimer, setShowTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [detailExercise, setDetailExercise] = useState<ModalExercise | null>(null);

  const handleLogSuccess = (exercise: Exercise) => {
    increment(exercise.exerciseId);
    setActiveSheet(null);
    // Start rest timer
    setTimerSeconds(exercise.restSeconds ?? 60);
    setShowTimer(true);
  };

  const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);
  const completedSets = Object.values(setsLogged).reduce((a, b) => a + b, 0);
  const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  const allDone = exercises.every((e) => (setsLogged[e.exerciseId] ?? 0) >= e.sets);

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        {!hideHeader && (
          <>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
              {t("todaysWorkout")}
            </p>
            <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--color-text)", lineHeight: 1.2, marginBottom: "16px" }}>
              {planName}
            </h1>
          </>
        )}

        {/* Progress bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
              {t("setsProgress", { completed: completedSets, total: totalSets })}
            </span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: allDone ? "var(--color-lime)" : "var(--color-text-muted)" }}>
              {progressPct}%
            </span>
          </div>
          <div style={{ height: "6px", borderRadius: "3px", backgroundColor: "var(--color-border)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progressPct}%`, backgroundColor: "var(--color-lime)", borderRadius: "3px", transition: "width 0.4s ease" }} />
          </div>
        </div>

        {allDone && exercises.length > 0 && (
          <div style={{ marginTop: "16px", padding: "14px 16px", borderRadius: "14px", backgroundColor: "rgba(204,255,0,0.1)", border: "1.5px solid var(--color-lime)", textAlign: "center" }}>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-lime)" }}>{t("workoutComplete")}</p>
          </div>
        )}
      </div>

      {/* Exercise cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {exercises.map((exercise) => (
          <WorkoutCard
            key={exercise.exerciseId}
            exerciseId={exercise.exerciseId}
            name={exercise.name}
            gifUrl={exercise.gifUrl}
            muscleGroup={exercise.muscleGroup}
            sets={exercise.sets}
            reps={exercise.reps}
            restSeconds={exercise.restSeconds}
            setsLogged={setsLogged[exercise.exerciseId] ?? 0}
            onLogSet={() => setActiveSheet(exercise)}
            onOpenDetail={() => setDetailExercise({ name: exercise.name, gifUrl: exercise.gifUrl, targetMuscles: exercise.muscleGroup ? [exercise.muscleGroup] : [] })}
          />
        ))}
      </div>

      {/* Log Set Sheet */}
      {activeSheet && (
        <LogSetSheet
          exerciseId={activeSheet.exerciseId}
          exerciseName={activeSheet.name}
          traineeId={traineeId}
          planId={planId}
          onSuccess={() => handleLogSuccess(activeSheet)}
          onClose={() => setActiveSheet(null)}
        />
      )}

      {/* Rest Timer */}
      {showTimer && (
        <RestTimer
          seconds={timerSeconds}
          onDismiss={() => setShowTimer(false)}
        />
      )}

      {/* Exercise Detail Modal */}
      <ExerciseDetailModal
        exercise={detailExercise}
        open={detailExercise !== null}
        onClose={() => setDetailExercise(null)}
      />
    </>
  );
}
