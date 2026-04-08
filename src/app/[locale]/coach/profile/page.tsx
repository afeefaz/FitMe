import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileCard } from "@/components/ui/ProfileCard";
import { setRequestLocale, getTranslations } from "next-intl/server";

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export default async function CoachProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tc = await getTranslations("common");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, role, height_cm, weight_kg, date_of_birth")
    .eq("id", user!.id)
    .single<{ full_name: string; email: string; role: string; height_cm: number | null; weight_kg: number | null; date_of_birth: string | null }>();

  return (
    <ProfileCard
      fullName={profile?.full_name ?? tc("coachDefault")}
      email={profile?.email ?? user!.email ?? ""}
      role="coach"
      heightCm={profile?.height_cm}
      weightKg={profile?.weight_kg}
      dateOfBirth={profile?.date_of_birth}
    />
  );
}
