interface BadgeProps {
  variant?: "lime" | "amber" | "red" | "muted";
  children: React.ReactNode;
}

export function Badge({ variant = "muted", children }: BadgeProps) {
  const styles: Record<string, React.CSSProperties> = {
    lime: {
      background: "rgba(204,255,0,0.15)",
      color: "var(--color-lime)",
      border: "1px solid rgba(204,255,0,0.3)",
    },
    amber: {
      background: "rgba(245,158,11,0.15)",
      color: "#F59E0B",
      border: "1px solid rgba(245,158,11,0.3)",
    },
    red: {
      background: "rgba(239,68,68,0.15)",
      color: "#EF4444",
      border: "1px solid rgba(239,68,68,0.3)",
    },
    muted: {
      background: "var(--color-surface-2)",
      color: "var(--color-text-muted)",
      border: "1px solid var(--color-border)",
    },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: "9999px",
        fontSize: "12px",
        fontWeight: 700,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        ...styles[variant],
      }}
    >
      {children}
    </span>
  );
}
