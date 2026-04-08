"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("common");
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-bg)",
        color: "var(--color-text)",
        gap: "16px",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <div style={{ fontSize: "56px" }}>🏋️</div>
      <h1 style={{ fontSize: "32px", fontWeight: 800 }}>404</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: "16px" }}>
        Page not found
      </p>
      <Link
        href="/"
        style={{
          marginTop: "8px",
          padding: "12px 24px",
          borderRadius: "14px",
          background: "var(--color-lime)",
          color: "#000",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        {t("back")}
      </Link>
    </div>
  );
}
