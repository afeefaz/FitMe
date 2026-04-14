import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { setRequestLocale } from "next-intl/server";
import { WeeklyPlanView } from "@/components/trainee/WeeklyPlanView";
import { GithubPagesAuthGate } from "@/components/ui/GithubPagesAuthGate";
import { TraineeWorkoutPageClient } from "@/components/trainee/TraineeWorkoutPageClient";

const isGithubPages = process.env.GITHUB_PAGES === "true";


type Props = { params: Promise<{ locale: string }> };

export default async function TraineeWorkoutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (isGithubPages) {
    return <TraineeWorkoutPageClient />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  return <WeeklyPlanView traineeId={user!.id} />;
}
