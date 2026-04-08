"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BottomNav } from "@/components/ui/BottomNav";
import { useNotificationStore, useRealtimeNotification } from "@/hooks/useRealtimeNotification";
import { createClient } from "@/lib/supabase/client";

const HomeIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const UsersIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const UserIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("navigation");
  const hasNotification = useNotificationStore((s) => s.hasNotification);
  const [coachId, setCoachId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCoachId(data.user.id);
    });
  }, []);

  useRealtimeNotification(coachId);

  const navItems = [
    {
      href: "/coach/dashboard",
      label: t("home"),
      icon: <HomeIcon />,
      activeIcon: <HomeIcon filled />,
    },
    {
      href: "/coach/clients",
      label: t("clients"),
      icon: <UsersIcon />,
      activeIcon: <UsersIcon filled />,
      showDot: hasNotification,
    },
    {
      href: "/coach/profile",
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
    </div>
  );
}
