"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { WeeklyPlanView } from "@/components/trainee/WeeklyPlanView";
import { requireClientRole } from "@/lib/supabase/clientAuth";

export function TraineeWorkoutPageClient() {
  const router = useRouter();
  const [traineeId, setTraineeId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const guard = await requireClientRole({ role: "trainee", router });
      if (!guard) {
        return;
      }
      const { userId } = guard;

      if (!cancelled) {
        setTraineeId(userId);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!traineeId) {
    return (
      <div style={{ padding: "24px 16px" }}>
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>Loading workout...</p>
      </div>
    );
  }

  return <WeeklyPlanView traineeId={traineeId} />;
}