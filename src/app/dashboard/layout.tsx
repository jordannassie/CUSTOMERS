import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { userHasAgencySoftware } from "@/modules/launch-kit/access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const allowed = await userHasAgencySoftware(user.id, user.email);
  if (!allowed) redirect("/agency/activate");

  return children;
}
