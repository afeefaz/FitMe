import { z } from "npm:zod";
import { createAdminClient } from "../_shared/clients.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { requireCoach } from "../_shared/auth.ts";

const bodySchema = z.object({
  clientId: z.string().uuid(),
  traineeId: z.string().uuid(),
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

  const { clientId, traineeId } = parsed.data;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = admin as any;
  const { data: clientRow } = await sb
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("coach_id", coach.user.id)
    .single();

  if (!clientRow) {
    return json({ error: "Client not found" }, 404);
  }

  await sb.from("workout_logs").delete().eq("trainee_id", traineeId);
  await sb.from("water_logs").delete().eq("user_id", traineeId);

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

  const { error: authError } = await admin.auth.admin.deleteUser(traineeId);
  if (authError) {
    console.error("Failed to delete auth account:", authError.message);
  }

  return json({ success: true });
});
