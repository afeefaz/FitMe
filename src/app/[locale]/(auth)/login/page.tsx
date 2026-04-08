"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { LanguageSelector } from "@/components/ui/LanguageSelector";

type FormErrors = Partial<Record<"email" | "password" | "root", string>>;

export default function LoginPage() {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const tc = useTranslations("common");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const loginSchema = z.object({
      email: z.string().email(tv("emailInvalid")),
      password: z.string().min(6, tv("passwordMin6")),
    });

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.issues.forEach((err) => {
        const field = err.path[0] as keyof FormErrors;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });

    if (error) {
      setErrors({ root: error.message });
      setLoading(false);
      return;
    }

    if (data.user) {
      // Fetch role to determine redirect
      const { data: profile } = await supabase
        .from("users")
        .select("role, preferred_locale")
        .eq("id", data.user.id)
        .single<{ role: string; preferred_locale: string | null }>();

      if (profile?.role === "coach") {
        router.push("/coach/dashboard");
      } else {
        router.push("/trainee/today");
      }
      router.refresh();
    }
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6 py-12"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      {/* Logo / Wordmark */}
      <div className="mb-10 text-center">
        <h1
          className="text-5xl tracking-tight"
          style={{
            fontWeight: 800,
            color: "var(--color-lime)",
            letterSpacing: "-0.03em",
          }}
        >
          FitMe
        </h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "6px", fontSize: "15px" }}>
          {tc("taglineShort")}
        </p>
      </div>

      {/* Language switcher */}
      <div style={{ marginBottom: "24px" }}>
        <LanguageSelector />
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm card-clay px-6 py-8"
        style={{ animation: "var(--animate-scale-in)" }}
      >
        <h2
          className="text-2xl mb-6"
          style={{ fontWeight: 700, color: "var(--color-text)" }}
        >
          {t("loginHeading")}
        </h2>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* Root error */}
          {errors.root && (
            <div
              className="px-4 py-3 rounded-2xl text-sm"
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#FCA5A5",
              }}
            >
              {errors.root}
            </div>
          )}

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-sm"
              style={{ color: "var(--color-text-muted)", fontWeight: 600 }}
            >
              {t("email")}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className="w-full px-4 py-3.5 rounded-2xl text-base outline-none transition-all"
              style={{
                background: "var(--color-surface-2)",
                color: "var(--color-text)",
                border: errors.email
                  ? "1.5px solid #EF4444"
                  : "1.5px solid transparent",
                minHeight: "56px",
              }}
              onFocus={(e) =>
                !errors.email &&
                (e.target.style.border = "1.5px solid var(--color-lime)")
              }
              onBlur={(e) =>
                !errors.email &&
                (e.target.style.border = "1.5px solid transparent")
              }
            />
            {errors.email && (
              <p className="text-xs" style={{ color: "#FCA5A5" }}>
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm"
              style={{ color: "var(--color-text-muted)", fontWeight: 600 }}
            >
              {t("password")}
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("passwordPlaceholder")}
                className="w-full px-4 py-3.5 rounded-2xl text-base outline-none transition-all"
                style={{
                  background: "var(--color-surface-2)",
                  color: "var(--color-text)",
                  border: errors.password
                    ? "1.5px solid #EF4444"
                    : "1.5px solid transparent",
                  minHeight: "56px",
                  paddingRight: "52px",
                }}
                onFocus={(e) =>
                  !errors.password &&
                  (e.target.style.border = "1.5px solid var(--color-lime)")
                }
                onBlur={(e) =>
                  !errors.password &&
                  (e.target.style.border = "1.5px solid transparent")
                }
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-muted)",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                }}
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs" style={{ color: "#FCA5A5" }}>
                {errors.password}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-tap w-full mt-2 rounded-2xl text-base font-bold transition-all"
            style={{
              minHeight: "56px",
              background: loading ? "var(--color-lime-dim)" : "var(--color-lime)",
              color: "var(--color-black)",
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "var(--shadow-clay-lime)",
            }}
          >
            {loading ? t("signingIn") : t("signinButton")}
          </button>
        </form>

        <p
          className="text-center text-sm mt-6"
          style={{ color: "var(--color-text-muted)" }}
        >
          {t("noAccount")}{" "}
          <Link
            href="/signup"
            style={{ color: "var(--color-lime)", fontWeight: 600 }}
          >
            {t("signupLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
