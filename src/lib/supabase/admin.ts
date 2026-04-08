import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

// ⚠️ This client uses the service role key.
// It bypasses RLS — NEVER import this in client components or expose to the browser.
// Only use in server-side Route Handlers and Server Actions.

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}

export const adminClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
