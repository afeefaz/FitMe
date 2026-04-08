"use client";

import { ExerciseBrowser } from "@/components/ui/ExerciseBrowser";

export function CoachExerciseBrowser() {
  return (
    <ExerciseBrowser
      title="Exercise Library"
      subtitle="Tap any exercise to view the GIF & instructions"
      defaultGroup="chest"
    />
  );
}
