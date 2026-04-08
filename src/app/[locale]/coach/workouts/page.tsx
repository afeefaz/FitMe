import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { CoachExerciseBrowser } from "@/components/coach/CoachExerciseBrowser";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function CoachWorkoutsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  return <CoachExerciseBrowser />;
}
