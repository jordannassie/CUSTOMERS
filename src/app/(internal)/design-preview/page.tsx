import { Suspense } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/require";
import PageLoading from "@/components/PageLoading";
import { DesignPreview } from "./_components/design-preview";

export const metadata: Metadata = {
  title: "Design preview",
  robots: { index: false, follow: false },
};

export default function DesignPreviewPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminOnlyPreview />
    </Suspense>
  );
}

// Reads the session, so it must stream behind Suspense under Cache Components (D-80).
async function AdminOnlyPreview() {
  await requireAdmin();
  return <DesignPreview />;
}
