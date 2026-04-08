import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Step 1: Run i18n routing middleware ────────────────────
  const i18nResponse = handleI18nRouting(request);

  // If next-intl wants to redirect (locale negotiation), respect it
  if (i18nResponse.status !== 200) {
    return i18nResponse;
  }

  // ── Step 2: Extract resolved locale from pathname ───────────
  // After i18n middleware, the pathname always starts with /<locale>/...
  const segments = pathname.split("/");
  const locale = routing.locales.includes(segments[1] as "en" | "he" | "ar")
    ? segments[1]
    : routing.defaultLocale;

  // ── Step 3: Set up Supabase client with cookie forwarding ───
  let response = NextResponse.next({
    request,
    headers: i18nResponse.headers,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
            headers: i18nResponse.headers,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — validates JWT and prevents spoofing
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Public routes — no auth needed (under any locale) ───────
  const pathWithoutLocale = "/" + segments.slice(2).join("/");
  const isPublicRoute =
    pathWithoutLocale === "/" ||
    pathWithoutLocale === "" ||
    pathWithoutLocale.startsWith("/login") ||
    pathWithoutLocale.startsWith("/signup");

  // ── Redirect unauthenticated users away from protected routes
  if (!user && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${locale}/login`;
    return NextResponse.redirect(redirectUrl);
  }

  // ── Redirect authenticated users away from auth pages ───────
  if (user && isPublicRoute && pathWithoutLocale !== "/" && pathWithoutLocale !== "") {
    const { data: profile } = await supabase
      .from("users")
      .select("role, preferred_locale")
      .eq("id", user.id)
      .single<{ role: string; preferred_locale: string | null }>();

    const savedLocale = profile?.preferred_locale ?? locale;
    const destination =
      profile?.role === "coach"
        ? `/${savedLocale}/coach/dashboard`
        : `/${savedLocale}/trainee/today`;

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = destination;
    return NextResponse.redirect(redirectUrl);
  }

  // ── Enforce role-based route access ─────────────────────────
  const isCoachRoute = pathWithoutLocale.startsWith("/coach");
  const isTraineeRoute = pathWithoutLocale.startsWith("/trainee");

  if (user && (isCoachRoute || isTraineeRoute)) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single<{ role: string }>();

    const role = profile?.role;

    if (isCoachRoute && role !== "coach") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/${locale}/trainee/today`;
      return NextResponse.redirect(redirectUrl);
    }

    if (isTraineeRoute && role !== "trainee") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/${locale}/coach/dashboard`;
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Match all routes except static files, _next, API, and service worker
    "/((?!api|_next/static|_next/image|favicon.ico|icons|sw.js|manifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css)$).*)",
  ],
};
