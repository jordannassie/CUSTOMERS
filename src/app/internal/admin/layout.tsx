import { SessionWatcher } from "@/app/_components/session-watcher";
import { SkipLink } from "@/components/app/SkipLink";
import AdminNav from "./_components/admin-nav";
import { requireAdmin } from "@/modules/auth";

export const metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false } };

// Blocking on purpose (D-80, BUG-020): the admin check runs before anything streams, so a
// non-admin gets a real redirect. Behind Suspense the redirect arrived mid-stream and looped.
export const instant = false;

// Pages still call requireAdmin() themselves: layouts do not re-render on navigation.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin({ next: "/internal/admin" });

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <SkipLink />
      <SessionWatcher />
      <AdminNav adminEmail={admin.email ?? ""} />
      <main id="main" tabIndex={-1} className="min-w-0 flex-1 outline-none">
        {children}
      </main>
    </div>
  );
}
