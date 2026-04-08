import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminClient as any)
    .from("app_settings")
    .select("value")
    .eq("key", "signup_enabled")
    .single();

  if (error) {
    // Default to enabled if setting is missing
    return NextResponse.json({ enabled: true });
  }

  return NextResponse.json({ enabled: data.value === true || data.value === "true" });
}
