"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";

type Mode = "root" | "coach" | "trainee";

interface GithubPagesAuthGateProps {
  locale: string;
  mode: Mode;
}

export function GithubPagesAuthGate({ locale, mode }: GithubPagesAuthGateProps) {
  const router = useRouter();
  const [message, setMessage] = useState("Checking session...");

  useEffect(() => {
    let isMounted = true;

    async function run() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (!session?.user) {
        router.replace("/login", { locale });
        return;
      }

      if (mode === "root") {
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
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (!isMounted) return;

      if (mode === "coach" && profile?.role !== "coach") {
        router.replace("/trainee/today", { locale });
        return;
      }

      if (mode === "trainee" && profile?.role !== "trainee") {
        router.replace("/coach/dashboard", { locale });
        return;
      }

      setMessage("Session verified.");
    }

    void run();
    return () => {
      isMounted = false;
    };
  }, [locale, mode, router]);

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
        <p style={{ fontSize: "14px", color: "var(--color-text-muted)", margin: 0 }}>
          {message}
        </p>
      </div>
    </div>
  );
}
