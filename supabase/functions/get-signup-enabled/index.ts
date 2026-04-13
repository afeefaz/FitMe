import { createAdminClient } from "../_shared/clients.ts";
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("app_settings")
    .select("value")
    .eq("key", "signup_enabled")
    .single();

  if (error) {
    return json({ enabled: true });
  }

  return json({ enabled: data.value === true || data.value === "true" });
});
