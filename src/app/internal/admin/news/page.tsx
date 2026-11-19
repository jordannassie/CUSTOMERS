import { requireAdmin } from "@/modules/auth";
import NewsClient from "./NewsClient";
import { PERIOD_OPTIONS, type Period } from "./_components/news-config";

export const metadata = { title: "LinkedIn studio" };

type Props = { searchParams: Promise<{ period?: string | string[] }> };

export default async function AdminNewsPage({ searchParams }: Props) {
  await requireAdmin({ next: "/internal/admin/news" });
  const { period } = await searchParams;
  // An unknown ?period= starts on the last 24 hours.
  const initial: Period = PERIOD_OPTIONS.find((p) => p.value === period)?.value ?? "24h";
  return <NewsClient initialPeriod={initial} />;
}
