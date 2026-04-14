import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { CoachLayoutShell } from "@/components/coach/CoachLayoutShell";

const isGithubPages = process.env.GITHUB_PAGES === "true";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function CoachLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!isGithubPages) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect({ href: "/login", locale });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user!.id)
      .single<{ role: string | null }>();

    if (profile?.role !== "coach") {
      redirect({ href: "/trainee/today", locale });
    }
  }

  return <CoachLayoutShell>{children}</CoachLayoutShell>;
}
