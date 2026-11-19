import { Suspense } from "react";
import { adminEmails, requireAdmin } from "@/modules/auth";
import { getLead, listLeads, oldLeadValuesInUse } from "@/modules/feedback";
import { ListSkeleton, PageSkeleton } from "../_components/skeletons";
import LeadsClient from "./LeadsClient";
import { leadIdFromParams, viewFromParams } from "./_components/lead-query";

export const metadata = { title: "Leads" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// The first page is read here, so the list shows with the page instead of after it loads (admin audit
// 2026-11-12: 4.5 to 6 s). Filters, paging and opening a lead then run in the browser.
export default function AdminLeadsPage({ searchParams }: Props) {
  return (
    <Suspense
      fallback={
        <PageSkeleton label="Loading leads">
          <ListSkeleton />
        </PageSkeleton>
      }
    >
      <LiveLeads searchParams={searchParams} />
    </Suspense>
  );
}

async function LiveLeads({ searchParams }: Props) {
  await requireAdmin({ next: "/internal/admin/leads" });
  const params = await searchParams;
  const view = viewFromParams(params);
  const leadId = leadIdFromParams(params);
  const [list, old] = await Promise.all([listLeads(view), oldLeadValuesInUse()]);
  // A shared lead that is not on this page is read on its own.
  const open = leadId ? (list?.leads.find((l) => l.id === leadId) ?? (await getLead(leadId))) : null;
  return (
    <LeadsClient
      // The admins a lead can be handed to (ADMIN_EMAILS).
      admins={adminEmails()}
      initialView={view}
      initialList={list}
      initialLead={open}
      old={old}
    />
  );
}
