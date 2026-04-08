"use client";

import { Link, usePathname } from "@/i18n/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  showDot?: boolean;
}

interface BottomNavProps {
  items: NavItem[];
}

export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: "rgba(18, 18, 18, 0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid var(--color-border)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          height: "64px",
          maxWidth: "480px",
          margin: "0 auto",
          padding: "0 8px",
        }}
      >
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                padding: "8px 20px",
                borderRadius: "16px",
                textDecoration: "none",
                minWidth: "64px",
                position: "relative",
                transition: "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)",
                transform: isActive ? "scale(1.05)" : "scale(1)",
              }}
              onTouchStart={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = "scale(0.92)";
              }}
              onTouchEnd={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = isActive
                  ? "scale(1.05)"
                  : "scale(1)";
              }}
            >
              {/* Notification dot */}
              {item.showDot && (
                <span
                  style={{
                    position: "absolute",
                    top: "6px",
                    insetInlineEnd: "14px",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#EF4444",
                    border: "2px solid var(--color-bg)",
                    zIndex: 1,
                  }}
                />
              )}

              {/* Icon */}
              <span
                style={{
                  color: isActive ? "var(--color-lime)" : "var(--color-text-dim)",
                  transition: "color 0.2s ease",
                  lineHeight: 1,
                }}
              >
                {isActive && item.activeIcon ? item.activeIcon : item.icon}
              </span>

              {/* Label */}
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "var(--color-lime)" : "var(--color-text-dim)",
                  transition: "color 0.2s ease",
                  letterSpacing: "0.01em",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
