"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { ExerciseBrowser } from "@/components/ui/ExerciseBrowser";
import { requireClientRole } from "@/lib/supabase/clientAuth";

export function TraineeExercisesPageClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const guard = await requireClientRole({ role: "trainee", router });
      if (!guard) {
        return;
      }

      if (!cancelled) {
        setReady(true);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div style={{ padding: "24px 16px" }}>
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>Loading exercises...</p>
      </div>
    );
  }

  return (
    <ExerciseBrowser
      title="Exercise Library"
      subtitle="Tap any exercise to view the GIF & instructions"
      defaultGroup="chest"
    />
  );
}