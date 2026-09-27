import { requireAdmin } from "@/modules/auth";
import AdminNav from "./admin-nav";

// Reads the session, so it must stream behind Suspense under Cache Components (D-80).
// Pages still call requireAdmin() themselves: layouts and pages render in parallel.
export default async function AdminFrame({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin({ next: "/internal/admin" });

  return (
    <>
      <AdminNav adminEmail={admin.email ?? ""} />
      <main className="min-w-0 flex-1">{children}</main>
    </>
  );
}
