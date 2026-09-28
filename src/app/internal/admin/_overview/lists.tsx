import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { AdminOverview } from "@/modules/admin";
import Section, { Empty } from "../businesses/[id]/_components/section";
import { formatDate } from "../businesses/_components/scan-parts";
import { StatusBadge, TestBadge } from "../agencies/_components/agency-parts";

const list = "divide-y divide-border rounded-md border border-border bg-surface text-[13px]";

function ViewAll({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-[13px] font-medium text-primary hover:underline">
      {children}
    </Link>
  );
}

export function RecentSignups({ rows }: { rows: AdminOverview["recentSignups"] }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Section title="Recent signups">
        {rows.length === 0 ? (
          <Empty>No one has signed up yet.</Empty>
        ) : (
          <ul className={list}>
            {rows.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <Link href={`/internal/admin/agencies/${a.id}`} className="truncate font-medium text-primary hover:underline">
                      {a.name}
                    </Link>
                    {a.isTest && <TestBadge />}
                  </span>
                  <span className="block truncate text-text-hint">{a.ownerEmail ?? "Owner email unknown"}</span>
                  <span className="block text-text-hint">Signed up {formatDate(a.createdAt)}</span>
                </span>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </Section>
      <ViewAll href="/internal/admin/agencies">All agencies</ViewAll>
    </div>
  );
}

export function FailedScans({ rows }: { rows: AdminOverview["recentFailedScans"] }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Section title="Recent failed scans">
        {rows.length === 0 ? (
          <Empty>No failed scans. Nothing to retry.</Empty>
        ) : (
          <ul className={list}>
            {rows.map((j) => (
              <li key={j.id} className="flex flex-col gap-0.5 px-4 py-3">
                <span className="flex items-start justify-between gap-3">
                  <Link href={`/internal/admin/businesses/${j.businessId}`} className="truncate font-medium text-primary hover:underline">
                    {j.businessName}
                  </Link>
                  <span className="shrink-0 text-text-hint">{formatDate(j.at)}</span>
                </span>
                {j.agencyName && <span className="truncate text-muted-foreground">{j.agencyName}</span>}
                <span className="line-clamp-2 break-words text-low-text">{j.error ?? "No error message"}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <ViewAll href="/internal/admin/scans?status=failed">Retry failed scans</ViewAll>
    </div>
  );
}

const SEVERITY = { info: "tint", warning: "mid", critical: "low" } as const;

export function OpenAlerts({ rows }: { rows: AdminOverview["openAlerts"] }) {
  return (
    <Section title="Open alerts">
      {rows.length === 0 ? (
        <Empty>No open alerts. Alerts for things like a failing AI provider or a spending spike will show here.</Empty>
      ) : (
        <ul className={list}>
          {rows.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <span className="min-w-0 break-words">{a.message}</span>
              <span className="flex shrink-0 flex-col items-end gap-0.5">
                <Badge variant={SEVERITY[a.severity]}>{a.severity}</Badge>
                <span className="text-text-hint">{formatDate(a.createdAt)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
