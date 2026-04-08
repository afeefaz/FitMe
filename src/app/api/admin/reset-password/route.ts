import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  traineeId: z.string().uuid(),
  clientId: z.string().uuid(),
  newPassword: z.string().min(8).max(72).optional(),
  sendEmail: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  // ── 1. Auth — must be a coach ─────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (profile?.role !== "coach") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 2. Validate body ──────────────────────────────────────────
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Validation error" }, { status: 400 });
  }

  const { traineeId, clientId, newPassword, sendEmail } = parsed.data;

  // ── 3. Verify this coach owns this client ─────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: clientRow } = await (adminClient as any)
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("coach_id", user.id)
    .single();

  if (!clientRow) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // ── 4. Get trainee email for reset email ──────────────────────
  if (sendEmail) {
    const { data: traineeAuth } = await adminClient.auth.admin.getUserById(traineeId);
    const email = traineeAuth?.user?.email;
    if (!email) return NextResponse.json({ error: "Could not get trainee email" }, { status: 400 });

    // Generate a recovery link (magic link) — use supabase's built-in
    const { error } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, mode: "email" });
  }

  // ── 5. Set new password directly ─────────────────────────────
  if (newPassword) {
    const { error } = await adminClient.auth.admin.updateUserById(traineeId, {
      password: newPassword,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, mode: "direct" });
  }

  return NextResponse.json({ error: "Must provide newPassword or sendEmail" }, { status: 400 });
}
