import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAgencyProgramAccess, getLaunchKitAccess, claimPurchasesForUser } from "./dal";

export async function requireLaunchKitUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/academy");
  }
  if (user.email) {
    await claimPurchasesForUser(user.id, user.email);
  }
  const access = await getLaunchKitAccess({ userId: user.id, email: user.email });
  if (!access.launchKitPurchased) {
    redirect("/start-ai-business");
  }
  return { user, access };
}

export async function requireAgencyProgramUser() {
  const { user } = await requireLaunchKitUser();
  const program = await getAgencyProgramAccess(user.id);
  return { user, program };
}

export async function userHasAgencySoftware(userId: string, email?: string | null): Promise<boolean> {
  const kit = await getLaunchKitAccess({ userId, email });
  if (!kit.launchKitPurchased) return true;

  const program = await getAgencyProgramAccess(userId);
  if (program.active) return true;

  const svc = createServiceClient();
  const { data: billing } = await svc
    .from("billing_accounts")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  if (billing?.status === "active" || billing?.status === "trialing") return true;
  return false;
}
