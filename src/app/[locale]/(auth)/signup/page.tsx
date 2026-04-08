"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { z } from "zod";
import type { UserRole } from "@/lib/types";
import { useTranslations, useLocale } from "next-intl";
import { LanguageSelector } from "@/components/ui/LanguageSelector";

type FormErrors = Partial<
  Record<"full_name" | "email" | "password" | "role" | "root", string>
>;

type Sex = "male" | "female";

export default function SignupPage() {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<1 | 2>(1);
  const [slideDir, setSlideDir] = useState<"forward" | "none">("none");

  // Step 1 fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [role, setRole] = useState<UserRole>("trainee");

  // Step 2 fields (optional)
  const [sex, setSex] = useState<Sex | null>(null);
  const [dob, setDob] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [signupEnabled, setSignupEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/settings/signup-enabled")
      .then((r) => r.json())
      .then((d) => {
        if (!d.enabled) {
          router.push("/login");
        } else {
          setSignupEnabled(true);
        }
      })
      .catch(() => setSignupEnabled(true));
  }, [router]);

  function handleStep1Continue(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const step1Schema = z.object({
      full_name: z.string().min(2, tv("nameMin")),
      email: z.string().email(tv("emailInvalid")),
      password: z
        .string()
        .min(8, tv("passwordMin8"))
        .regex(/[A-Z]/, tv("passwordUppercase"))
        .regex(/[0-9]/, tv("passwordNumber")),
    });

    const result = step1Schema.safeParse({ full_name: fullName, email, password });
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.issues.forEach((err) => {
        const field = err.path[0] as keyof FormErrors;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSlideDir("forward");
    setStep(2);
  }

  async function handleSubmit() {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          preferred_locale: locale,
          ...(sex ? { sex } : {}),
        },
      },
    });

    if (error) {
      setErrors({ root: error.message });
      setLoading(false);
      setStep(1);
      return;
    }

    if (data.user) {
      // Update body stats if provided
      const updates: Record<string, unknown> = {};
      if (dob) updates.date_of_birth = dob;
      if (heightCm) updates.height_cm = parseFloat(heightCm);
      if (weightKg) updates.weight_kg = parseFloat(weightKg);

      if (Object.keys(updates).length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("users").update(updates).eq("id", data.user.id);
      }

      if (role === "coach") {
        router.push("/coach/dashboard");
      } else {
        router.push("/trainee/today");
      }
      router.refresh();
    }
  }

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    background: "var(--color-surface-2)",
    color: "var(--color-text)",
    border: hasError ? "1.5px solid #EF4444" : "1.5px solid transparent",
    minHeight: "56px",
  });

  // Don't render until we know if signup is enabled (avoid flash)
  if (signupEnabled === null) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "var(--color-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      />
    );
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6 py-12"
      style={{ backgroundColor: "var(--color-bg)", overflow: "hidden" }}
    >
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(60px); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes slide-in-left {
          from { transform: translateX(-60px); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        .step-forward { animation: slide-in-right 0.32s cubic-bezier(0.34,1.2,0.64,1) both; }
        .step-back    { animation: slide-in-left  0.32s cubic-bezier(0.34,1.2,0.64,1) both; }
      `}</style>

      {/* Logo */}
      <div className="mb-8 text-center">
        <h1
          className="text-5xl tracking-tight"
          style={{ fontWeight: 800, color: "var(--color-lime)", letterSpacing: "-0.03em" }}
        >
          FitMe
        </h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "6px", fontSize: "15px" }}>
          {t("createAccount")}
        </p>
      </div>

      {/* Language switcher */}
      <div style={{ marginBottom: "24px" }}>
        <LanguageSelector />
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {[1, 2].map((s) => (
          <div
            key={s}
            style={{
              width: s === step ? "24px" : "8px",
              height: "8px",
              borderRadius: "4px",
              background: s <= step ? "var(--color-lime)" : "var(--color-border)",
              transition: "width 0.3s ease, background 0.3s ease",
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-sm card-clay px-6 py-8">

        {step === 1 ? (
          <div className={slideDir === "none" ? "" : "step-back"} key="step1">
            <h2 className="text-2xl mb-2" style={{ fontWeight: 700, color: "var(--color-text)" }}>
              {t("signupHeading")}
            </h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "20px" }}>
              Step 1 of 2 — Account details
            </p>

            <form onSubmit={handleStep1Continue} noValidate className="flex flex-col gap-4">
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

              {/* Role selector */}
              <div
                style={{
                  display: "flex",
                  background: "var(--color-surface-2)",
                  borderRadius: "16px",
                  padding: "3px",
                }}
              >
                {(["trainee", "coach"] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "13px",
                      border: "none",
                      background: role === r ? "var(--color-lime)" : "transparent",
                      color: role === r ? "#000" : "var(--color-text-muted)",
                      fontWeight: role === r ? 700 : 500,
                      fontSize: "14px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {r === "trainee" ? `🏋️ ${t("roleTrainee")}` : `🧑‍💼 ${t("roleCoach")}`}
                  </button>
                ))}
              </div>

              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="full_name" className="text-sm" style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>
                  👤 {t("fullName")}
                </label>
                <input
                  id="full_name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t("fullNamePlaceholder")}
                  className="w-full px-4 py-3.5 rounded-2xl text-base outline-none transition-all"
                  style={inputStyle(!!errors.full_name)}
                  onFocus={(e) => !errors.full_name && (e.target.style.border = "1.5px solid var(--color-lime)")}
                  onBlur={(e) => !errors.full_name && (e.target.style.border = "1.5px solid transparent")}
                />
                {errors.full_name && <p className="text-xs" style={{ color: "#FCA5A5" }}>{errors.full_name}</p>}
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm" style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>
                  ✉️ {t("email")}
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  className="w-full px-4 py-3.5 rounded-2xl text-base outline-none transition-all"
                  style={inputStyle(!!errors.email)}
                  onFocus={(e) => !errors.email && (e.target.style.border = "1.5px solid var(--color-lime)")}
                  onBlur={(e) => !errors.email && (e.target.style.border = "1.5px solid transparent")}
                />
                {errors.email && <p className="text-xs" style={{ color: "#FCA5A5" }}>{errors.email}</p>}
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm" style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>
                  🔒 {t("password")}
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="password"
                    type={showPass ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("passwordHint")}
                    className="w-full px-4 py-3.5 rounded-2xl text-base outline-none transition-all"
                    style={{ ...inputStyle(!!errors.password), paddingRight: "52px" }}
                    onFocus={(e) => !errors.password && (e.target.style.border = "1.5px solid var(--color-lime)")}
                    onBlur={(e) => !errors.password && (e.target.style.border = "1.5px solid transparent")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    style={{
                      position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--color-text-muted)", padding: 4, display: "flex", alignItems: "center",
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
                {errors.password && <p className="text-xs" style={{ color: "#FCA5A5" }}>{errors.password}</p>}
              </div>

              {/* Continue */}
              <button
                type="submit"
                className="btn-tap w-full mt-2 rounded-2xl text-base font-bold transition-all"
                style={{
                  minHeight: "56px",
                  background: "var(--color-lime)",
                  color: "#000",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-clay-lime)",
                  border: "none",
                }}
              >
                Continue →
              </button>
            </form>

            <p className="text-center text-sm mt-6" style={{ color: "var(--color-text-muted)" }}>
              {t("alreadyHaveAccount")}{" "}
              <Link href="/login" style={{ color: "var(--color-lime)", fontWeight: 600 }}>
                {t("signinLink")}
              </Link>
            </p>
          </div>
        ) : (
          <div className="step-forward" key="step2">
            <button
              onClick={() => { setSlideDir("none"); setStep(1); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--color-text-muted)", fontSize: "14px",
                display: "flex", alignItems: "center", gap: "6px",
                marginBottom: "16px", padding: 0,
              }}
            >
              ← Back
            </button>

            <h2 className="text-2xl mb-1" style={{ fontWeight: 700, color: "var(--color-text)" }}>
              Tell us about yourself
            </h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
              Step 2 of 2 — Optional, you can add this later
            </p>

            {errors.root && (
              <div
                className="px-4 py-3 rounded-2xl text-sm mb-4"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#FCA5A5",
                }}
              >
                {errors.root}
              </div>
            )}

            <div className="flex flex-col gap-4">
              {/* Sex selector */}
              <div className="flex flex-col gap-2">
                <label className="text-sm" style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>
                  Biological Sex
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  {(["male", "female"] as Sex[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSex(sex === s ? null : s)}
                      style={{
                        flex: 1,
                        padding: "16px 12px",
                        borderRadius: "var(--radius-clay)",
                        border: sex === s ? "2px solid var(--color-lime)" : "2px solid var(--color-border)",
                        background: sex === s ? "rgba(204,255,0,0.08)" : "var(--color-surface-2)",
                        color: sex === s ? "var(--color-lime)" : "var(--color-text-muted)",
                        fontWeight: sex === s ? 700 : 500,
                        fontSize: "15px",
                        cursor: "pointer",
                        transition: "all 0.2s cubic-bezier(0.34,1.26,0.64,1)",
                        transform: sex === s ? "scale(1.04)" : "scale(1)",
                      }}
                    >
                      {s === "male" ? "♂ Male" : "♀ Female"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date of Birth */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="dob" className="text-sm" style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>
                  🎂 Date of Birth
                </label>
                <input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl text-base outline-none transition-all"
                  style={{
                    background: "var(--color-surface-2)",
                    color: "var(--color-text)",
                    border: "1.5px solid transparent",
                    minHeight: "56px",
                    colorScheme: "dark",
                  }}
                  onFocus={(e) => (e.target.style.border = "1.5px solid var(--color-lime)")}
                  onBlur={(e) => (e.target.style.border = "1.5px solid transparent")}
                />
              </div>

              {/* Height + Weight side by side */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="height" className="text-sm" style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>
                    📏 Height (cm)
                  </label>
                  <input
                    id="height"
                    type="number"
                    inputMode="decimal"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="170"
                    className="w-full px-4 py-3.5 rounded-2xl text-base outline-none transition-all"
                    style={{
                      background: "var(--color-surface-2)",
                      color: "var(--color-text)",
                      border: "1.5px solid transparent",
                      minHeight: "56px",
                    }}
                    onFocus={(e) => (e.target.style.border = "1.5px solid var(--color-lime)")}
                    onBlur={(e) => (e.target.style.border = "1.5px solid transparent")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="weight" className="text-sm" style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>
                    ⚖️ Weight (kg)
                  </label>
                  <input
                    id="weight"
                    type="number"
                    inputMode="decimal"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="70"
                    className="w-full px-4 py-3.5 rounded-2xl text-base outline-none transition-all"
                    style={{
                      background: "var(--color-surface-2)",
                      color: "var(--color-text)",
                      border: "1.5px solid transparent",
                      minHeight: "56px",
                    }}
                    onFocus={(e) => (e.target.style.border = "1.5px solid var(--color-lime)")}
                    onBlur={(e) => (e.target.style.border = "1.5px solid transparent")}
                  />
                </div>
              </div>

              {/* Create Account */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="btn-tap w-full mt-2 rounded-2xl text-base font-bold transition-all"
                style={{
                  minHeight: "56px",
                  background: loading ? "var(--color-lime-dim)" : "var(--color-lime)",
                  color: "#000",
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "var(--shadow-clay-lime)",
                  border: "none",
                }}
              >
                {loading ? t("creatingAccount") : t("createAccountButton")}
              </button>

              {/* Skip */}
              <button
                type="button"
                onClick={() => { setDob(""); setHeightCm(""); setWeightKg(""); setSex(null); handleSubmit(); }}
                disabled={loading}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--color-text-muted)", fontSize: "14px",
                  fontWeight: 500, textAlign: "center", padding: "4px",
                }}
              >
                Skip for now →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
