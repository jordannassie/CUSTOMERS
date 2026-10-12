import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/modules/auth";
import { getSystemStatus } from "@/modules/system-status";
import StatusView from "./_components/status-view";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin({ next: "/internal/admin/settings" });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Same outer width as every admin page; the status list itself reads best narrow, so it stays left aligned. */}
      <div className="flex max-w-3xl flex-col gap-8">
        <header>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Settings</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Whether every service the app depends on is connected and working. Keys are changed in Netlify and Supabase.
          </p>
        </header>

        <Suspense fallback={<StatusSkeleton />}>
          <LiveStatus />
        </Suspense>
      </div>
    </div>
  );
}

async function LiveStatus() {
  return <StatusView status={await getSystemStatus()} />;
}

function StatusSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Checking services">
      <Skeleton className="h-[116px] rounded-md" />
      {[3, 4, 1, 2].map((rows, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="rounded-md" style={{ height: rows * 64 }} />
        </div>
      ))}
    </div>
  );
}
