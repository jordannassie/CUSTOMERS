import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require";
import AdminNav from "./AdminNav";

export const metadata = { title: "Admin | Customers.Direct", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let admin: { userId: string; email: string };
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#F8FAFD] flex">
      <AdminNav adminEmail={admin!.email} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
