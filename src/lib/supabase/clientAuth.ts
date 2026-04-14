"use client";

import { createClient } from "@/lib/supabase/client";

export type AppRole = "coach" | "trainee";

type RouterLike = {
  replace: (href: string, options?: { locale?: string }) => void;
};

function redirect(router: RouterLike, href: string, locale?: string) {
  if (locale) {
    router.replace(href, { locale });
    return;
  }
  router.replace(href);
}

export async function requireClientRole(options: {
  role: AppRole;
  router: RouterLike;
  locale?: string;
  unauthenticatedHref?: string;
  unauthorizedHref?: string;
}) {
  const {
    role,
    router,
    locale,
    unauthenticatedHref = "/login",
    unauthorizedHref = "/login",
  } = options;

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect(router, unauthenticatedHref, locale);
    return null;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single<{ role: string | null }>();

  if (!profile || profile.role !== role) {
    redirect(router, unauthorizedHref, locale);
    return null;
  }

  return {
    supabase,
    userId: session.user.id,
  };
}