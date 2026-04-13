import { z } from "npm:zod";
import { createAdminClient } from "../_shared/clients.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { requireCoach } from "../_shared/auth.ts";

const bodySchema = z
  .object({
    full_name: z.string().min(2).max(100),
    email: z.string().email().optional(),
    username: z
      .string()
      .min(3)
      .max(30)
      .regex(/^[a-z0-9_]+$/)
      .optional(),
    password: z.string().min(8).max(72),
  })
  .refine((d) => d.email || d.username, {
    message: "Email or username is required",
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const coach = await requireCoach(req);
  if (!coach.ok) return json({ error: coach.error }, coach.status);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "Validation error" }, 400);
  }

  const { full_name, email: rawEmail, username, password } = parsed.data;
  const email = rawEmail ?? `${username}@fitme.local`;

  const admin = createAdminClient();
  const { data: newAuthUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name,
      role: "trainee",
      ...(username ? { username } : {}),
    },
  });

  if (createError) {
    if (createError.message.includes("already been registered")) {
      return json({ error: "An account with this email already exists." }, 409);
    }
    return json({ error: createError.message }, 500);
  }

  const traineeId = newAuthUser.user.id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: clientError } = await (admin as any).from("clients").insert({
    coach_id: coach.user.id,
    trainee_id: traineeId,
    status: "needs_plan",
  });

  if (clientError) {
    await admin.auth.admin.deleteUser(traineeId);
    return json({ error: "Failed to link trainee to coach." }, 500);
  }

  return json(
    {
      success: true,
      trainee: { id: traineeId, email, full_name, username: username ?? null },
    },
    201
  );
});
