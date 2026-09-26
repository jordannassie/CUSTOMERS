import { requireAdmin } from "@/modules/auth";
import LeadsClient from "./LeadsClient";

export const metadata = { title: "Leads | Admin", robots: { index: false } };

export default async function AdminLeadsPage() {
  await requireAdmin({ next: "/internal/admin/leads" });
  return <LeadsClient />;
}
