"use client";

import { createClient } from "@/lib/supabase/client";

function getFunctionsBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  }

  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1`;
}

export async function callEdgeFunction(
  functionName: string,
  init?: RequestInit,
  requireAuth = false
) {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  if (requireAuth) {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;
    if (!token) {
      throw new Error("Not authenticated");
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${getFunctionsBaseUrl()}/${functionName}`, {
    ...init,
    headers,
  });
}
