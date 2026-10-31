import { requireAdmin } from "@/modules/auth";
import LeadsClient from "./LeadsClient";

export const metadata = { title: "Leads" };

export default async function AdminLeadsPage() {
  await requireAdmin({ next: "/internal/admin/leads" });
  return <LeadsClient />;
}
