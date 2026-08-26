import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAdminSession } from "@/lib/admin-session";

export type AdminContext = {
  userId: string;
  email: string;
};

/**
 * Server-side admin gate. Verifies:
 * 1. Authenticated Supabase user
 * 2. profiles.account_type = 'admin'
 * 3. Valid PIN session via iron-session
 *
 * Redirects on any failure — never leaks data to unauthorized users.
 */
export async function requireAdmin(): Promise<AdminContext> {
  // 1. Must be authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/internal/admin");
  }

  // 2. Must have account_type = 'admin'
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_type !== "admin") {
    redirect("/dashboard");
  }

  // 3. Must have a verified PIN session
  const session = await getAdminSession();
  if (!session.isAdmin) {
    redirect("/internal/admin/pin");
  }

  return { userId: user.id, email: user.email ?? "" };
}

/**
 * Checks admin role only (no PIN), used for the PIN page itself to ensure
 * only actual admins can even reach the PIN form.
 */
export async function requireAdminRole(): Promise<{ userId: string; email: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/internal/admin");
  }

  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_type !== "admin") {
    redirect("/dashboard");
  }

  return { userId: user.id, email: user.email ?? "" };
}
