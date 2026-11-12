import { adminEmails, requireAdmin } from "@/modules/auth";
import LeadsClient from "./LeadsClient";

export const metadata = { title: "Leads" };

export default async function AdminLeadsPage() {
  await requireAdmin({ next: "/internal/admin/leads" });
  // The admins a lead can be handed to (ADMIN_EMAILS).
  return <LeadsClient admins={adminEmails()} />;
}
