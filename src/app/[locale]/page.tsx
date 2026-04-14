import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { RootPageClientResolver } from "@/components/ui/RootPageClientResolver";

const isGithubPages = process.env.GITHUB_PAGES === "true";

type Props = { params: Promise<{ locale: string }> };

export default async function RootPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (isGithubPages) {
    return <RootPageClientResolver locale={locale} />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, preferred_locale")
    .eq("id", user!.id)
    .single<{ role: string; preferred_locale: string | null }>();

  // Honour saved locale preference
  const targetLocale = (profile?.preferred_locale as "en" | "he" | "ar") ?? locale;

  if (profile?.role === "coach") {
    redirect({ href: "/coach/dashboard", locale: targetLocale });
  } else {
    redirect({ href: "/trainee/today", locale: targetLocale });
  }
  return null;
}

