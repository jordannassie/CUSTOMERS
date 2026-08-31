import { requireAdmin } from "@/lib/admin/require";
import LeadsClient from "./LeadsClient";

export const metadata = { title: "Leads | Admin", robots: { index: false } };

export default async function AdminLeadsPage() {
  await requireAdmin();
  return <LeadsClient />;
}
