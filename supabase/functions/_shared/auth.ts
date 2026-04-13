import { createAdminClient, createUserClient } from "./clients.ts";

type AppUser = {
  id: string;
  role: string | null;
};

export async function requireAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { error: "Unauthorized", status: 401 } as const;

  const userClient = createUserClient(authHeader);
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    return { error: "Unauthorized", status: 401 } as const;
  }

  return { user, authHeader } as const;
}

export async function requireCoach(req: Request): Promise<
  | { ok: true; user: AppUser; authHeader: string }
  | { ok: false; error: string; status: number }
> {
  const auth = await requireAuthenticatedUser(req);
  if ("error" in auth) {
    return { ok: false, error: auth.error, status: auth.status };
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from("users")
    .select("id, role")
    .eq("id", auth.user.id)
    .single<AppUser>();

  if (!profile || profile.role !== "coach") {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  return { ok: true, user: profile, authHeader: auth.authHeader };
}
