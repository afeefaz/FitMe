import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  username: z.string().min(1).max(50),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminClient as any)
    .from("users")
    .select("email")
    .eq("username", parsed.data.username)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Username not found" }, { status: 404 });
  }

  return NextResponse.json({ email: data.email });
}
