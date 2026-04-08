import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72),
});

export async function POST(request: NextRequest) {
  // ── 1. Authenticate the requester ────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Verify the requester is a coach ───────────────────────
  const { data: coachProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (coachProfile?.role !== "coach") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 3. Validate request body ──────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation error" },
      { status: 400 }
    );
  }

  const { full_name, email, password } = parsed.data;

  // ── 4. Create auth user via Admin API ────────────────────────
  const { data: newAuthUser, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email verification for coach-created accounts
      user_metadata: {
        full_name,
        role: "trainee",
      },
    });

  if (createError) {
    // Surface friendly message for duplicate emails
    if (createError.message.includes("already been registered")) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  const traineeId = newAuthUser.user.id;

  // ── 5. The DB trigger handles public.users insertion.
  //       Now link trainee to this coach in clients table. ───────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: clientError } = await (adminClient as any).from("clients").insert({
    coach_id: user.id,
    trainee_id: traineeId,
    status: "needs_plan",
  });

  if (clientError) {
    // Rollback auth user to maintain consistency
    await adminClient.auth.admin.deleteUser(traineeId);
    return NextResponse.json(
      { error: "Failed to link trainee to coach." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      trainee: { id: traineeId, email, full_name },
    },
    { status: 201 }
  );
}
