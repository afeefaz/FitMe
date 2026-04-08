import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  clientId: z.string().uuid(),
  traineeId: z.string().uuid(),
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

  const { clientId, traineeId } = parsed.data;

  // ── 3. Verify this coach owns this client ─────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = adminClient as any;
  const { data: clientRow } = await sb
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("coach_id", user.id)
    .single();

  if (!clientRow) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // ── 4. Delete all client data ─────────────────────────────────
  // plan_exercises and plan_days cascade from plans → client row
  await sb.from("workout_logs").delete().eq("trainee_id", traineeId);
  await sb.from("water_logs").delete().eq("user_id", traineeId);

  // Get plan IDs to delete plan_days/plan_exercises (may not cascade automatically)
  const { data: plans } = await sb.from("plans").select("id").eq("client_id", clientId);
  if (plans && plans.length > 0) {
    const planIds = (plans as { id: string }[]).map((p) => p.id);
    for (const planId of planIds) {
      const { data: days } = await sb.from("plan_days").select("id").eq("plan_id", planId);
      if (days && days.length > 0) {
        const dayIds = (days as { id: string }[]).map((d) => d.id);
        await sb.from("plan_exercises").delete().in("plan_day_id", dayIds);
      }
      await sb.from("plan_days").delete().eq("plan_id", planId);
    }
    await sb.from("plans").delete().in("id", planIds);
  }

  await sb.from("clients").delete().eq("id", clientId);
  await sb.from("users").delete().eq("id", traineeId);

  // ── 5. Delete auth account ────────────────────────────────────
  const { error: authError } = await adminClient.auth.admin.deleteUser(traineeId);
  if (authError) {
    // Data already deleted, log but don't fail
    console.error("Failed to delete auth account:", authError.message);
  }

  return NextResponse.json({ success: true });
}
