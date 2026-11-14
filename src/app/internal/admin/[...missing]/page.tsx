import { notFound } from "next/navigation";
import { requireAdmin } from "@/modules/auth";

export const metadata = { title: "Page not found" };

// Any admin address with no page of its own shows not-found.tsx inside the admin layout, not the site-wide 404.
export default async function AdminMissingPage({ params }: { params: Promise<{ missing: string[] }> }) {
  const { missing } = await params;
  await requireAdmin({ next: `/internal/admin/${missing.join("/")}` });
  notFound();
}
