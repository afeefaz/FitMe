import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { setRequestLocale } from "next-intl/server";
import { WeeklyPlanView } from "@/components/trainee/WeeklyPlanView";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function TraineeWorkoutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  return <WeeklyPlanView traineeId={user!.id} />;
}
