import { Clapperboard } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/modules/auth";
import { listRecentOrders } from "@/modules/video-ads/dal";
import AdminEmpty from "../_components/admin-empty";
import { formatDate, money } from "../_components/format";
import AdminPageHeader from "../_components/page-header";

export const metadata = { title: "Video ad orders" };

export default async function VideoAdOrdersPage() {
  await requireAdmin({ next: "/internal/admin/video-ads" });
  const { orders, unavailable } = await listRecentOrders();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminPageHeader
        title="AI video ad orders"
        subtitle={
          <>
            One-time orders from /ads. Paid briefs also show in{" "}
            <Link href="/internal/admin/leads" className="font-medium text-primary hover:underline">Leads</Link> with the
            source AI Video Ads.
          </>
        }
      />
      {unavailable && (
        <p className="rounded-md border border-border bg-mid-bg px-4 py-3 text-[14px] text-mid-text">
          The video_ad_orders table is not in this database yet (migration 071). Until then, read the briefs in Leads.
        </p>
      )}
      {orders.length === 0 && !unavailable && (
        <AdminEmpty icon={Clapperboard} title="No video ad orders yet">Orders paid on /ads show here.</AdminEmpty>
      )}
      <ul className="flex flex-col gap-4">
        {orders.map((order) => (
          <li key={order.id} className="flex flex-col gap-1 rounded-md border border-border bg-card p-4 text-[14px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium capitalize">{order.packageId}</span>
              <span>{money(order.amountCents / 100)}</span>
              <Badge variant={order.status === "brief_submitted" ? "good" : "mid"}>
                {order.status === "brief_submitted" ? "Brief sent" : "Paid, brief pending"}
              </Badge>
            </div>
            <p className="text-[13px] text-muted-foreground">{formatDate(order.createdAt, true)}</p>
            <p className="mt-2 break-words">
              {order.customerName ?? "Name pending"}, {order.email ?? "email pending"}
            </p>
            {order.businessName && <p className="break-words">{order.businessName}</p>}
            {order.websiteUrl && <p className="text-[13px] break-all text-primary">{order.websiteUrl}</p>}
            {order.product && <p className="mt-2 break-words">Product: {order.product}</p>}
            {order.audience && <p className="break-words">Audience: {order.audience}</p>}
            {order.creativeInstructions ? (
              <p className="mt-2 break-words whitespace-pre-wrap text-muted-foreground">{order.creativeInstructions}</p>
            ) : (
              <p className="mt-2 text-[13px] text-mid-text">Brief not sent yet.</p>
            )}
            {order.assetUrl && <p className="mt-2 text-[13px] break-all text-primary">{order.assetUrl}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
