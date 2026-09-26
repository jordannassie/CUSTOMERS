import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require";
import PageLoading from "@/components/PageLoading";
import AdminNav from "./AdminNav";

export const metadata = { title: "Admin | Customers.Direct", robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFD] flex">
      <Suspense fallback={<PageLoading />}>
        <AdminFrame>{children}</AdminFrame>
      </Suspense>
    </div>
  );
}

// Reads the session, so it must stream behind Suspense under Cache Components (D-80).
async function AdminFrame({ children }: { children: React.ReactNode }) {
  let admin: { userId: string; email: string };
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/dashboard");
  }

  return (
    <>
      <AdminNav adminEmail={admin!.email} />
      <main className="flex-1 overflow-auto">{children}</main>
    </>
  );
}
