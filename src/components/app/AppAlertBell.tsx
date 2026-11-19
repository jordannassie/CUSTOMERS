"use client";

import { CreditCard, FlaskConical, Hourglass, ScanSearch, ShieldAlert, Wallet, type LucideIcon } from "lucide-react";
import { AlertCenter } from "@/components/alerts/alert-center";
import type { BellAlert } from "@/components/alerts/types";
import type { AppAlert, AppAlertIcon } from "@/modules/workspace";

const ICONS: Record<AppAlertIcon, LucideIcon> = {
  account: ShieldAlert,
  card: CreditCard,
  credits: Wallet,
  trial: Hourglass,
  test: FlaskConical,
  scan: ScanSearch,
};

/** The app's alert bell (owner, 2026-11-17): the same box as the admin one, for the account and its scans. */
export function AppAlertBell({ alerts }: { alerts: AppAlert[] }) {
  const items = alerts.map(
    (a): BellAlert => ({ id: a.id, severity: a.severity, icon: ICONS[a.icon], title: a.title, text: a.text, when: a.when ?? undefined, link: a.link ?? undefined }),
  );
  return (
    <AlertCenter
      alerts={items}
      storageKey="app:read-alerts"
      statuses={["new", "seen"]}
      footer="Updated each time a page opens"
      emptyText="No alerts. Your account and scans are fine."
    />
  );
}
