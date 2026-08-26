import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Public metadata — no secrets
export const metadata = { title: "Admin | Customers.Direct", robots: { index: false } };

// Hardcoded owner admin — always has access regardless of database state
const OWNER_EMAILS = ["jordannassie@gmail.com"];

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Owner always gets in
  if (user.email && OWNER_EMAILS.includes(user.email.toLowerCase())) {
    return { email: user.email, isOwner: true };
  }

  // Database check: profiles.account_type = 'admin'
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.account_type !== "admin") return null;
  return { email: user.email ?? "", isOwner: false };
}

const NAV_ITEMS = [
  { label: "Overview",         href: "/internal/admin"                        },
  { label: "Users",            href: "/internal/admin/users"                  },
  { label: "Businesses",       href: "/internal/admin/businesses"             },
  { label: "Scans",            href: "/internal/admin/scans"                  },
  { label: "Usage",            href: "/internal/admin/usage"                  },
  { label: "Errors",           href: "/internal/admin/errors"                 },
  { label: "Feature Requests", href: "/internal/admin/feature-requests"       },
  { label: "Settings",         href: "/internal/admin/settings"               },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser();
  // Non-admins get redirected — layout is gated at the page level too
  if (!admin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col">
      {/* Top bar */}
      <header className="border-b border-white/8 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <Link href="/internal/admin" className="text-[13px] font-black text-white/80 tracking-tight hover:text-white transition-colors">
            CD <span className="text-[#0866F5]">Admin</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-0.5" aria-label="Admin navigation">
            {NAV_ITEMS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="text-[12.5px] font-medium text-white/50 hover:text-white/80 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-white/30 hidden sm:block">{admin.email}</span>
          <Link
            href="/dashboard"
            className="text-[11px] font-semibold text-[#0866F5] hover:text-blue-300 transition-colors border border-[#0866F5]/30 hover:border-blue-300/50 px-3 py-1 rounded-full"
          >
            ← User View
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
