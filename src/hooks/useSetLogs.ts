"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { cacheGet, cacheSet } from "@/lib/cache";

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function todayKey(traineeId: string, planId: string): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `fitme:sets:${traineeId}:${planId}:${date}`;
}

interface UseSetLogsResult {
  counts: Record<string, number>;
  increment: (exerciseId: string) => void;
}

export function useSetLogs(traineeId: string, planId: string): UseSetLogsResult {
  const cacheKey = todayKey(traineeId, planId);

  const [counts, setCounts] = useState<Record<string, number>>(() => {
    return cacheGet<Record<string, number>>(cacheKey, TTL_MS) ?? {};
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchTodayCounts() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = createClient() as any;
      const today = new Date().toISOString().slice(0, 10);

      const { data: logRows } = await sb
        .from("workout_logs")
        .select("id")
        .eq("trainee_id", traineeId)
        .eq("plan_id", planId)
        .gte("created_at", `${today}T00:00:00.000Z`)
        .lte("created_at", `${today}T23:59:59.999Z`);

      if (cancelled) return;
      if (!logRows || logRows.length === 0) return;

      const workoutLogIds = (logRows as Array<{ id: string }>).map((r) => r.id);

      const { data: setRows } = await sb
        .from("set_logs")
        .select("exercise_id")
        .in("workout_log_id", workoutLogIds);

      if (cancelled) return;
      if (!setRows) return;

      // Count server-side sets per exercise
      const serverCounts: Record<string, number> = {};
      for (const row of setRows as Array<{ exercise_id: string }>) {
        serverCounts[row.exercise_id] = (serverCounts[row.exercise_id] ?? 0) + 1;
      }

      setCounts((prev) => {
        // Merge: take max of local optimistic count and server count
        const merged: Record<string, number> = { ...prev };
        for (const [exerciseId, serverCount] of Object.entries(serverCounts)) {
          merged[exerciseId] = Math.max(prev[exerciseId] ?? 0, serverCount);
        }
        cacheSet(cacheKey, merged, TTL_MS);
        return merged;
      });
    }

    fetchTodayCounts().catch(() => {});

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traineeId, planId]);

  const increment = useCallback(
    (exerciseId: string) => {
      setCounts((prev) => {
        const next = { ...prev, [exerciseId]: (prev[exerciseId] ?? 0) + 1 };
        cacheSet(cacheKey, next, TTL_MS);
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cacheKey]
  );

  return { counts, increment };
}
