"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { CoachExerciseBrowser } from "@/components/coach/CoachExerciseBrowser";
import { requireClientRole } from "@/lib/supabase/clientAuth";

export function CoachWorkoutsPageClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const guard = await requireClientRole({ role: "coach", router });
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
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>Loading workouts...</p>
      </div>
    );
  }

  return <CoachExerciseBrowser />;
}