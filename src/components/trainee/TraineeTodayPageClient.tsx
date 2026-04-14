"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { TraineeHome } from "@/components/trainee/TraineeHome";
import { requireClientRole } from "@/lib/supabase/clientAuth";

interface TraineeTodayPageClientProps {
  locale: string;
}

export function TraineeTodayPageClient({ locale }: TraineeTodayPageClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [traineeId, setTraineeId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const guard = await requireClientRole({
        role: "trainee",
        router,
        locale,
        unauthorizedHref: "/coach/dashboard",
      });
      if (!guard) {
        return;
      }
      const { supabase, userId } = guard;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from("users")
        .select("full_name, weight_kg")
        .eq("id", userId)
        .single();

      setTraineeId(userId);
      setFullName(profile?.full_name ?? null);
      setWeightKg(profile?.weight_kg ?? null);
    } catch (err) {
      setError((err as Error).message || "Failed to load today view");
    } finally {
      setLoading(false);
    }
  }, [locale, router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", color: "var(--color-text-muted)" }}>
        Loading today...
      </div>
    );
  }

  if (error || !traineeId) {
    return (
      <div style={{ padding: "24px 16px", color: "var(--color-text-muted)" }}>
        {error ?? "Please sign in again."}
      </div>
    );
  }

  return <TraineeHome traineeId={traineeId} fullName={fullName} weightKg={weightKg} />;
}
