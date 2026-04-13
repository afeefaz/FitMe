import { z } from "npm:zod";
import { createAdminClient } from "../_shared/clients.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { requireCoach } from "../_shared/auth.ts";

const bodySchema = z.object({
  enabled: z.boolean(),
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
    return json({ error: "Invalid request body" }, 400);
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("app_settings").upsert(
    { key: "signup_enabled", value: parsed.data.enabled, updated_by: coach.user.id },
    { onConflict: "key" }
  );

  if (error) return json({ error: error.message }, 500);
  return json({ success: true });
});
