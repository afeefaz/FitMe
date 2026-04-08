import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { TraineeHome } from "@/components/trainee/TraineeHome";
import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function TraineeTodayPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  // Fetch user profile for name + body metrics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("users")
    .select("full_name, weight_kg")
    .eq("id", user!.id)
    .single();

  return (
    <TraineeHome
      traineeId={user!.id}
      fullName={profile?.full_name ?? null}
      weightKg={profile?.weight_kg ?? null}
    />
  );
}
