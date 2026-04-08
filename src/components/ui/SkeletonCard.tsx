interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ style }: SkeletonProps) {
  return (
    <div
      style={{
        background: "linear-gradient(90deg, var(--color-surface) 25%, var(--color-surface-2) 50%, var(--color-surface) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
        borderRadius: "12px",
        ...style,
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        borderRadius: "var(--radius-clay)",
        boxShadow: "var(--shadow-clay-sm)",
        overflow: "hidden",
        padding: "16px",
      }}
    >
      <Skeleton style={{ height: "200px", borderRadius: "16px", marginBottom: "12px" }} />
      <Skeleton style={{ height: "20px", width: "70%", marginBottom: "8px" }} />
      <Skeleton style={{ height: "16px", width: "40%" }} />
    </div>
  );
}
