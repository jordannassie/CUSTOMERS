import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/require";
import { DesignPreview } from "./_components/design-preview";

export const metadata: Metadata = {
  title: "Design preview",
  robots: { index: false, follow: false },
};

export default async function DesignPreviewPage() {
  await requireAdmin();
  return <DesignPreview />;
}
