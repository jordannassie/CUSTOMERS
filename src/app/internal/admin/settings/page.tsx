import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { recheckServices, syncServiceAlerts } from "@/modules/admin";
import { requireAdmin } from "@/modules/auth";
import { getSavedSystemStatus, getSystemStatus } from "@/modules/system-status";
import AdminPageHeader from "../_components/page-header";
import StatusView from "./_components/status-view";

export const metadata = { title: "System status" };

export default async function AdminSettingsPage() {
  await requireAdmin({ next: "/internal/admin/settings" });

  return (
    <div className="mx-auto w-full max-w-[calc(1200px*var(--px,1))] px-4 py-4 sm:px-6 sm:py-5">
      {/* Same outer width as every admin page; the status list itself reads best narrow, so it stays left aligned. */}
      <div className="flex flex-col gap-6">
        <AdminPageHeader
          title="System status"
          subtitle="Whether every service the app depends on is connected and working. Keys are changed in Netlify and Supabase."
        />

        <Suspense fallback={<StatusSkeleton />}>
          <LiveStatus />
        </Suspense>
      </div>
    </div>
  );
}

// The last saved check opens at once (the 15-minute alerts job saves one). Only when there is none, or it is older
// than 20 minutes, are the seven services called live here; that live check also opens and closes their alerts.
const FRESH_MS = 20 * 60 * 1000;

async function LiveStatus() {
  const saved = await getSavedSystemStatus(FRESH_MS);
  if (saved) {
    return <StatusView status={saved} openAlerts={saved.services.filter((s) => s.state === "error").length} recheck={recheckServices} />;
  }
  const status = await getSystemStatus();
  return <StatusView status={status} openAlerts={await syncServiceAlerts(status.services)} recheck={recheckServices} />;
}

function StatusSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Checking services">
      <Skeleton className="h-[calc(116px*var(--px,1))] rounded-md" />
      {[3, 4, 1, 2].map((rows, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="rounded-md" style={{ height: rows * 64 }} />
        </div>
      ))}
    </div>
  );
}
