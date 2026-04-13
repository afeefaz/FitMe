import { z } from "npm:zod";
import { createAdminClient } from "../_shared/clients.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { requireCoach } from "../_shared/auth.ts";

const bodySchema = z.object({
  traineeId: z.string().uuid(),
  clientId: z.string().uuid(),
  newPassword: z.string().min(8).max(72).optional(),
  sendEmail: z.boolean().optional(),
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

  const { traineeId, clientId, newPassword, sendEmail } = parsed.data;

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: clientRow } = await (admin as any)
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("coach_id", coach.user.id)
    .single();

  if (!clientRow) return json({ error: "Client not found" }, 404);

  if (sendEmail) {
    const { data: traineeAuth } = await admin.auth.admin.getUserById(traineeId);
    const email = traineeAuth?.user?.email;
    if (!email) return json({ error: "Could not get trainee email" }, 400);

    const { error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    if (error) return json({ error: error.message }, 500);
    return json({ success: true, mode: "email" });
  }

  if (newPassword) {
    const { error } = await admin.auth.admin.updateUserById(traineeId, {
      password: newPassword,
    });
    if (error) return json({ error: error.message }, 500);
    return json({ success: true, mode: "direct" });
  }

  return json({ error: "Must provide newPassword or sendEmail" }, 400);
});
