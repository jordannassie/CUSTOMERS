import { requireAdmin } from "@/lib/admin/require";
import NewsClient from "./NewsClient";

export const metadata = { title: "AI Newsroom | Admin", robots: { index: false } };

export default async function AdminNewsPage() {
  await requireAdmin();
  return <NewsClient />;
}
