"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";

interface RootPageClientResolverProps {
  locale: string;
}

export function RootPageClientResolver({ locale }: RootPageClientResolverProps) {
  const router = useRouter();

  useEffect(() => {
    async function run() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login", { locale });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from("users")
        .select("role, preferred_locale")
        .eq("id", session.user.id)
        .single();

      const targetLocale = profile?.preferred_locale ?? locale;
      const targetHref =
        profile?.role === "coach" ? "/coach/dashboard" : "/trainee/today";

      router.replace(targetHref, { locale: targetLocale });
    }

    void run();
  }, [locale, router]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "var(--color-bg)",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          borderRadius: "20px",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          padding: "20px",
          color: "var(--color-text)",
          textAlign: "center",
        }}
      >
        <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "3px solid rgba(204,255,0,0.18)", borderTopColor: "var(--color-lime)", animation: "spin 0.8s linear infinite" }} />
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}