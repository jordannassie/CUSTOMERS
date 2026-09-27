import { Suspense } from "react";
import PageLoading from "@/components/PageLoading";
import AdminFrame from "./_components/admin-frame";

export const metadata = { title: "Admin", robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <Suspense fallback={<PageLoading />}>
        <AdminFrame>{children}</AdminFrame>
      </Suspense>
    </div>
  );
}
