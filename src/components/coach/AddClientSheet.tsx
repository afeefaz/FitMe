"use client";

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";

type FormErrors = Partial<Record<"full_name" | "email" | "password" | "root", string>>;

interface AddClientSheetProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddClientSheet({ onClose, onSuccess }: AddClientSheetProps) {
  const t = useTranslations("coach.clients");
  const tv = useTranslations("validation");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const runtimeSchema = z.object({
      full_name: z.string().min(2, tv("nameMin")),
      email: z.string().email(tv("emailInvalid")),
      password: z.string().min(8, tv("passwordMin8")),
    });

    const result = runtimeSchema.safeParse({ full_name: fullName, email, password });
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.issues.forEach((err) => {
        const field = err.path[0] as keyof FormErrors;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/create-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrors({ root: data.error ?? "Something went wrong" });
        return;
      }

      onSuccess();
    } catch {
      setErrors({ root: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "14px 16px",
    borderRadius: "16px",
    background: "var(--color-surface-2)",
    color: "var(--color-text)",
    border: hasError ? "1.5px solid #EF4444" : "1.5px solid var(--color-border)",
    fontSize: "15px",
    outline: "none",
    minHeight: "52px",
  });

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          backdropFilter: "blur(4px)",
          background: "rgba(0,0,0,0.6)",
          animation: "var(--animate-fade-in)",
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 61,
          background: "var(--color-surface)",
          borderRadius: "28px 28px 0 0",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
          padding: "8px 20px 32px",
          paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))",
          maxWidth: "480px",
          margin: "0 auto",
          animation: "sheet-up 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        <style>{`
          @keyframes sheet-up {
            from { transform: translateY(100%); opacity: 0.5; }
            to   { transform: translateY(0); opacity: 1; }
          }
        `}</style>

        {/* Handle */}
        <div
          style={{
            width: "36px",
            height: "4px",
            borderRadius: "2px",
            background: "var(--color-border)",
            margin: "8px auto 20px",
          }}
        />

        <h2
          style={{
            fontSize: "20px",
            fontWeight: 800,
            color: "var(--color-text)",
            marginBottom: "20px",
          }}
        >
          {t("addClient")}
        </h2>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {errors.root && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "14px",
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#FCA5A5",
                fontSize: "14px",
              }}
            >
              {errors.root}
            </div>
          )}

          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-muted)" }}>
              {t("traineeName")}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("traineeNamePlaceholder")}
              style={inputStyle(!!errors.full_name)}
              onFocus={(e) => { if (!errors.full_name) e.target.style.border = "1.5px solid var(--color-lime)"; }}
              onBlur={(e) => { if (!errors.full_name) e.target.style.border = "1.5px solid var(--color-border)"; }}
            />
            {errors.full_name && <p style={{ fontSize: "12px", color: "#FCA5A5" }}>{errors.full_name}</p>}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-muted)" }}>
              {t("emailLabel")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              style={inputStyle(!!errors.email)}
              onFocus={(e) => { if (!errors.email) e.target.style.border = "1.5px solid var(--color-lime)"; }}
              onBlur={(e) => { if (!errors.email) e.target.style.border = "1.5px solid var(--color-border)"; }}
            />
            {errors.email && <p style={{ fontSize: "12px", color: "#FCA5A5" }}>{errors.email}</p>}
          </div>

          {/* Temp Password */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-muted)" }}>
              {t("tempPassword")}
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("minCharsPlaceholder")}
              style={inputStyle(!!errors.password)}
              onFocus={(e) => { if (!errors.password) e.target.style.border = "1.5px solid var(--color-lime)"; }}
              onBlur={(e) => { if (!errors.password) e.target.style.border = "1.5px solid var(--color-border)"; }}
            />
            {errors.password && <p style={{ fontSize: "12px", color: "#FCA5A5" }}>{errors.password}</p>}
          </div>

          <Button type="submit" variant="lime" fullWidth loading={loading} style={{ marginTop: "4px" }}>
            {t("addClient")}
          </Button>
        </form>
      </div>
    </>
  );
}
