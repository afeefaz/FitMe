"use client";

import { useTranslations } from "next-intl";
import { BottomNav } from "@/components/ui/BottomNav";
import { PWAInstallPrompt } from "@/components/ui/PWAInstallPrompt";

const HomeIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const PlansIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 5v14M18 5v14M6 8h12M6 16h12M2 8h4M18 8h4M2 16h4M18 16h4"/>
  </svg>
);

const DumbbellIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 5v14M18 5v14M2 9h4M18 9h4M2 15h4M18 15h4M6 9h12M6 15h12"/>
  </svg>
);

const ActivityIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const UserIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

export default function TraineeLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("navigation");
  const navItems = [
    {
      href: "/trainee/today",
      label: t("home"),
      icon: <HomeIcon />,
      activeIcon: <HomeIcon filled />,
    },
    {
      href: "/trainee/plans",
      label: t("plans"),
      icon: <PlansIcon />,
      activeIcon: <PlansIcon filled />,
    },
    {
      href: "/trainee/exercises",
      label: t("exercises"),
      icon: <DumbbellIcon />,
      activeIcon: <DumbbellIcon filled />,
    },
    {
      href: "/trainee/workouts",
      label: t("activity"),
      icon: <ActivityIcon />,
      activeIcon: <ActivityIcon filled />,
    },
    {
      href: "/trainee/profile",
      label: t("profile"),
      icon: <UserIcon />,
      activeIcon: <UserIcon filled />,
    },
  ];

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "var(--color-bg)" }}>
      <main
        className="pb-safe-nav"
        style={{ maxWidth: "480px", margin: "0 auto" }}
      >
        {children}
      </main>
      <BottomNav items={navItems} />
      <PWAInstallPrompt />
    </div>
  );
}
