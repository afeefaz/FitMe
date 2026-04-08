import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "lime" | "ghost" | "surface";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
}

export function Button({
  variant = "lime",
  size = "md",
  fullWidth = false,
  loading = false,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const heights = { sm: "44px", md: "52px", lg: "60px" };
  const fontSizes = { sm: "13px", md: "15px", lg: "16px" };

  const variantStyles: Record<string, React.CSSProperties> = {
    lime: {
      background: disabled || loading ? "var(--color-lime-dim)" : "var(--color-lime)",
      color: "var(--color-black)",
      boxShadow: "var(--shadow-clay-lime)",
    },
    ghost: {
      background: "transparent",
      color: "var(--color-text-muted)",
      border: "1.5px solid var(--color-border)",
    },
    surface: {
      background: "var(--color-surface-2)",
      color: "var(--color-text)",
    },
  };

  return (
    <button
      disabled={disabled || loading}
      style={{
        minHeight: heights[size],
        fontSize: fontSizes[size],
        fontWeight: 700,
        borderRadius: "var(--radius-clay)",
        border: "none",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.6 : 1,
        width: fullWidth ? "100%" : "auto",
        padding: size === "sm" ? "0 16px" : "0 24px",
        transition: `transform var(--duration-fast) var(--ease-spring), box-shadow var(--duration-fast) ease`,
        ...variantStyles[variant],
        ...style,
      }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.96)";
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
      onTouchStart={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.96)";
      }}
      onTouchEnd={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
      {...props}
    >
      {loading ? (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <SpinnerIcon />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ animation: "spin 0.7s linear infinite" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="25 10" strokeLinecap="round" />
    </svg>
  );
}
