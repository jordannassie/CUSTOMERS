import { requireAdmin } from "@/modules/auth";
import NewsClient from "./NewsClient";

export const metadata = { title: "Agency LinkedIn studio" };

export default async function AdminNewsPage() {
  await requireAdmin({ next: "/internal/admin/news" });
  return <NewsClient />;
}
