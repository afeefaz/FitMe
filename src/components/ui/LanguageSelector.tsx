"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export function LanguageSelector() {
  const t = useTranslations("languageSelector");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = async (newLocale: string) => {
    if (newLocale === locale) return;
    // Update in DB if authenticated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("users").update({ preferred_locale: newLocale }).eq("id", user.id);
    }
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div style={{ display: "flex", gap: "8px" }}>
      {(["en", "he", "ar"] as const).map((l) => (
        <button
          key={l}
          onClick={() => handleChange(l)}
          style={{
            padding: "8px 16px",
            borderRadius: "100px",
            border: l === locale ? "1.5px solid var(--color-lime)" : "1.5px solid var(--color-border)",
            backgroundColor: l === locale ? "rgba(204,255,0,0.1)" : "transparent",
            color: l === locale ? "var(--color-lime)" : "var(--color-text-muted)",
            fontSize: "13px",
            fontWeight: l === locale ? 700 : 500,
            cursor: l === locale ? "default" : "pointer",
            transition: "all 0.15s",
          }}
          disabled={l === locale}
        >
          {t(l)}
        </button>
      ))}
    </div>
  );
}
