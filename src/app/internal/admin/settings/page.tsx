import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PRODUCT_ACCESS } from "@/config/product-access";
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

        <section aria-labelledby="product-access">
          <h2 id="product-access" className="mb-2 text-[14px] font-semibold">
            Product access
          </h2>
          <ul className="divide-y divide-border rounded-md border border-border bg-surface">
            <FlagRow label="Free beta access" on={PRODUCT_ACCESS.betaFreeAccess} note="Every signed-in user gets full access." />
            <FlagRow label="Billing" on={PRODUCT_ACCESS.billingEnabled} note="Stripe checkout and plan limits." />
            <FlagRow label="Trials" on={PRODUCT_ACCESS.trialEnabled} note="Trial countdown and end of trial." />
          </ul>
        </section>
      </div>
    </div>
  );
}

async function LiveStatus() {
  return <StatusView status={await getSystemStatus()} />;
}

function FlagRow({ label, on, note }: { label: string; on: boolean; note: string }) {
  return (
    <li className="flex items-start justify-between gap-3 px-4 py-3">
      <div>
        <p className="text-[14px] font-medium">{label}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{note}</p>
      </div>
      <span className="text-[13px] font-medium text-muted-foreground">{on ? "On" : "Off"}</span>
    </li>
  );
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
