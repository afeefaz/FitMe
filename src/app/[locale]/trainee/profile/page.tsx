import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileCard } from "@/components/ui/ProfileCard";
import { GithubPagesAuthGate } from "@/components/ui/GithubPagesAuthGate";
import { setRequestLocale, getTranslations } from "next-intl/server";

const isGithubPages = process.env.GITHUB_PAGES === "true";


type Props = { params: Promise<{ locale: string }> };

export default async function TraineeProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (isGithubPages) {
    return <GithubPagesAuthGate locale={locale} mode="trainee" />;
  }

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
      fullName={profile?.full_name ?? tc("traineeDefault")}
      email={profile?.email ?? user!.email ?? ""}
      role="trainee"
      heightCm={profile?.height_cm}
      weightKg={profile?.weight_kg}
      dateOfBirth={profile?.date_of_birth}
    />
  );
}
