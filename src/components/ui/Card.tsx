import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "sm" | "lime";
  animate?: boolean;
}

export function Card({
  variant = "default",
  animate = false,
  children,
  style,
  ...props
}: CardProps) {
  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      background: "var(--color-surface)",
      borderRadius: "var(--radius-clay)",
      boxShadow: "var(--shadow-clay)",
    },
    sm: {
      background: "var(--color-surface)",
      borderRadius: "calc(var(--radius-clay) - 4px)",
      boxShadow: "var(--shadow-clay-sm)",
    },
    lime: {
      background: "var(--color-surface)",
      borderRadius: "var(--radius-clay)",
      boxShadow: "var(--shadow-clay-lime)",
      border: "1.5px solid rgba(204,255,0,0.2)",
    },
  };

  return (
    <div
      style={{
        ...variantStyles[variant],
        animation: animate ? "var(--animate-slide-up)" : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
