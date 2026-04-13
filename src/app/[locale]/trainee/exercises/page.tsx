import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { ExerciseBrowser } from "@/components/ui/ExerciseBrowser";

const isGithubPages = process.env.GITHUB_PAGES === "true";


type Props = { params: Promise<{ locale: string }> };

export default async function TraineeExercisesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (isGithubPages) {
    redirect({ href: "/login", locale });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  return (
    <ExerciseBrowser
      title="Exercise Library"
      subtitle="Tap any exercise to view the GIF & instructions"
      defaultGroup="chest"
    />
  );
}
