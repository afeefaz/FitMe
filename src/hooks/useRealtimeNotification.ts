"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { create } from "zustand";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ── Zustand store for notification state ─────────────────────────────────────
interface NotificationStore {
  hasNotification: boolean;
  setHasNotification: (val: boolean) => void;
  clearNotification: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  hasNotification: false,
  setHasNotification: (val) => set({ hasNotification: val }),
  clearNotification: () => set({ hasNotification: false }),
}));

// ── Hook: subscribe to workout_logs Realtime changes (coach only) ─────────────
export function useRealtimeNotification(coachId: string | null) {
  const setHasNotification = useNotificationStore((s) => s.setHasNotification);

  useEffect(() => {
    if (!coachId) return;

    const supabase = createClient();
    let channel: RealtimeChannel;

    async function subscribe() {
      // Get trainee IDs for this coach to filter events
      const { data: clients } = await supabase
        .from("clients")
        .select("trainee_id")
        .eq("coach_id", coachId!);

      const traineeIds = (clients as { trainee_id: string }[] | null)?.map((c) => c.trainee_id) ?? [];
      if (traineeIds.length === 0) return;

      channel = supabase
        .channel(`coach-notifications-${coachId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "workout_logs",
          },
          (payload) => {
            const log = payload.new as { trainee_id: string; completed_at: string | null };
            // Only trigger if the workout is completed and belongs to one of this coach's trainees
            if (log.completed_at && traineeIds.includes(log.trainee_id)) {
              setHasNotification(true);
            }
          }
        )
        .subscribe();
    }

    subscribe();

    return () => {
      if (channel) {
        const supabase = createClient();
        supabase.removeChannel(channel);
      }
    };
  }, [coachId, setHasNotification]);
}
