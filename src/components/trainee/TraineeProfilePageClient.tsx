"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ProfileCard } from "@/components/ui/ProfileCard";
import { requireClientRole } from "@/lib/supabase/clientAuth";

export function TraineeProfilePageClient() {
  const router = useRouter();
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    full_name: string | null;
    email: string | null;
    role: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    date_of_birth: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const guard = await requireClientRole({ role: "trainee", router });
      if (!guard) {
        return;
      }
      const { supabase, userId } = guard;

      const { data } = await supabase
        .from("users")
        .select("full_name, email, role, height_cm, weight_kg, date_of_birth")
        .eq("id", userId)
        .single<{
          full_name: string | null;
          email: string | null;
          role: string | null;
          height_cm: number | null;
          weight_kg: number | null;
          date_of_birth: string | null;
        }>();

      if (!cancelled) {
        setProfile(data ?? null);
        setLoading(false);
      }
    }

    load().catch(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading || !profile) {
    return (
      <div style={{ padding: "24px 16px" }}>
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <ProfileCard
      fullName={profile.full_name ?? tc("traineeDefault")}
      email={profile.email ?? ""}
      role="trainee"
      heightCm={profile.height_cm}
      weightKg={profile.weight_kg}
      dateOfBirth={profile.date_of_birth}
    />
  );
}