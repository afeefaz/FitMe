import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { useTranslations } from "next-intl";
import type { ClientStatus } from "@/lib/types";

interface ClientRowProps {
  id: string;
  full_name: string;
  email: string;
  status: ClientStatus;
  hasDraft?: boolean;
  animationDelay?: string;
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      style={{
        width: "46px",
        height: "46px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #2A2A2A 0%, #333 100%)",
        border: "2px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "15px",
        fontWeight: 800,
        color: "var(--color-lime)",
        flexShrink: 0,
        letterSpacing: "0.02em",
      }}
    >
      {initials}
    </div>
  );
}

export function ClientRow({
  id,
  full_name,
  email,
  status,
  hasDraft,
  animationDelay,
}: ClientRowProps) {
  const t = useTranslations("coach.clients");
  return (
    <Link
      href={`/coach/clients/${id}/plan`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        padding: "14px 16px",
        background: "var(--color-surface)",
        borderRadius: "var(--radius-clay)",
        boxShadow: "var(--shadow-clay-sm)",
        textDecoration: "none",
        transition: "transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s ease",
        animation: "var(--animate-slide-up)",
        animationDelay: animationDelay ?? "0s",
      }}
      onTouchStart={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.transform = "scale(0.97)";
      }}
      onTouchEnd={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)";
      }}
    >
      <Avatar name={full_name} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontWeight: 700,
            fontSize: "15px",
            color: "var(--color-text)",
            marginBottom: "2px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {full_name}
        </p>
        <p
          style={{
            fontSize: "12px",
            color: "var(--color-text-muted)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {email}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        {hasDraft && (
          <Badge variant="amber">{t("statusReview")}</Badge>
        )}
        <Badge variant={status === "active" ? "lime" : "amber"}>
          {status === "active" ? t("statusActive") : t("statusNeedsPlan")}
        </Badge>
        <span style={{ color: "var(--color-text-dim)", fontSize: "18px" }}>›</span>
      </div>
    </Link>
  );
}
