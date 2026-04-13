import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { CoachExerciseBrowser } from "@/components/coach/CoachExerciseBrowser";
import { GithubPagesAuthGate } from "@/components/ui/GithubPagesAuthGate";

const isGithubPages = process.env.GITHUB_PAGES === "true";


type Props = { params: Promise<{ locale: string }> };

export default async function CoachWorkoutsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (isGithubPages) {
    return <GithubPagesAuthGate locale={locale} mode="coach" />;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  return <CoachExerciseBrowser />;
}
