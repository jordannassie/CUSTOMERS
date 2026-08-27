import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import AdminNav from "./AdminNav";

// Public metadata — no secrets
export const metadata = { title: "Admin | Customers.Direct", robots: { index: false } };

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Not authenticated at all
  if (!user) return null;

  // 1. ADMIN_EMAILS env var (comma-separated) — set in Netlify
  const envEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (user.email && envEmails.length > 0 && envEmails.includes(user.email.toLowerCase())) {
    return { email: user.email };
  }

  // 2. Database: profiles.account_type = 'admin'
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.account_type === "admin") {
    return { email: user.email ?? "" };
  }

  // 3. Beta fallback: first user who reaches this page gets admin role set.
  //    Check if there are NO other admins yet (single-owner bootstrap).
  const { count } = await service
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("account_type", "admin");

  if ((count ?? 0) === 0) {
    // No admin exists yet — grant this authenticated user admin rights
    await service.from("profiles").update({ account_type: "admin" }).eq("id", user.id);
    return { email: user.email ?? "" };
  }

  return null; // Has admins but this user isn't one
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#F8FAFD] flex">
      <AdminNav adminEmail={admin.email} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
