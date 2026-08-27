import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type AdminContext = {
  userId: string;
  email: string;
};

/**
 * Server-side admin gate. Verifies:
 * 1. Authenticated Supabase user
 * 2. profiles.account_type = 'admin' OR email in ADMIN_EMAILS env var
 *
 * No PIN required — authentication via Google / email login is sufficient.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/internal/admin");

  // ADMIN_EMAILS env shortcut (comma-separated)
  const envEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (user.email && envEmails.includes(user.email.toLowerCase())) {
    return { userId: user.id, email: user.email };
  }

  // profiles.account_type = 'admin'
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_type === "admin") {
    return { userId: user.id, email: user.email ?? "" };
  }

  redirect("/dashboard");
}

/** Alias — kept for any callers that used requireAdminRole separately */
export const requireAdminRole = requireAdmin;
