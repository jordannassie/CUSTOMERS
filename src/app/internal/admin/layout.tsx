import { SessionWatcher } from "@/app/_components/session-watcher";
import { SkipLink } from "@/components/app/SkipLink";
import AdminNav from "./_components/admin-nav";
import AdminTopBar from "./_components/admin-top-bar";
import { headers } from "next/headers";
import { safeNextPath } from "@/lib/safe-next";
import { resolveAlert } from "@/modules/admin";
import { requireAdmin } from "@/modules/auth";
import { alertBellData } from "./_components/alert-bell-data";

export const metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false } };

// Blocking on purpose (D-80, BUG-020): the admin check runs before anything streams, so a
// non-admin gets a real redirect. Behind Suspense the redirect arrived mid-stream and looped.
export const instant = false;

// Pages still call requireAdmin() themselves: layouts do not re-render on navigation.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The page being opened (set by proxy.ts), so signing in or entering the app code comes back to it, not the Overview.
  const opened = safeNextPath((await headers()).get("x-admin-path"), "/internal/admin");
  const admin = await requireAdmin({ next: opened.startsWith("/internal/admin") ? opened : "/internal/admin" });
  // The header's alert bell on every admin page (owner, 2026-11-16). Resolving one refreshes the page, and this with it.
  const bell = await alertBellData();

  // The app's frame (AppShell, 2026-11-10): the menu on the grey frame, then a white rounded window with a top bar.
  return (
    <div className="app-v2 app-compact flex min-h-dvh flex-col bg-muted lg:flex-row">
      <SkipLink />
      <SessionWatcher />
      <AdminNav adminEmail={admin.email ?? ""} bell={bell} resolve={resolveAlert} />
      <div className="flex min-w-0 flex-1 flex-col lg:py-2 lg:pr-2">
        <div className="flex min-h-full flex-1 flex-col bg-background lg:rounded-xl lg:border lg:border-border">
          <AdminTopBar bell={bell} resolve={resolveAlert} />
          <main id="main" tabIndex={-1} className="min-w-0 flex-1 outline-none">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
