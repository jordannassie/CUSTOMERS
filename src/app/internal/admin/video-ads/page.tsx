import { Clapperboard } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { websiteHref } from "@/lib/submitted-text";
import { requireAdmin } from "@/modules/auth";
import { listRecentOrders } from "@/modules/video-ads/dal";
import { getVideoAdPackage } from "@/modules/video-ads/packages";
import AdminEmpty from "../_components/admin-empty";
import { formatDate, money } from "../_components/format";
import AdminPageHeader from "../_components/page-header";

export const metadata = { title: "Video ad orders" };

export default async function VideoAdOrdersPage() {
  await requireAdmin({ next: "/internal/admin/video-ads" });
  const { orders, unavailable } = await listRecentOrders();

  return (
    <div className="mx-auto flex w-full max-w-[calc(1200px*var(--px,1))] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
      <AdminPageHeader
        title="Video ad orders"
        subtitle={
          <>
            One-time AI video ad orders from /ads. Paid briefs also show in{" "}
            <Link href="/internal/admin/leads?source=video_ad" className="font-medium text-primary hover:underline">Leads</Link>{" "}
            with the source AI video ads page.
          </>
        }
      />
      {unavailable && (
        <p className="rounded-md bg-primary-tint px-4 py-3 text-[length:calc(14px*var(--px,1))] text-foreground">
          Orders can&apos;t be listed on this site yet because its database hasn&apos;t been updated for them. Until then, read the briefs in Leads.
        </p>
      )}
      {orders.length === 0 && !unavailable && (
        <AdminEmpty icon={Clapperboard} title="No video ad orders yet">Orders paid on /ads show here.</AdminEmpty>
      )}
      <ul className="flex flex-col gap-4">
        {orders.map((order) => (
          <li key={order.id} className="flex flex-col gap-1 rounded-md border border-border bg-card p-4 text-[length:calc(14px*var(--px,1))]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{getVideoAdPackage(order.packageId)?.name ?? "Unknown package"}</span>
              <span>{money(order.amountCents / 100)}</span>
              <Badge variant={order.status === "brief_submitted" ? "secondary" : "tint"}>
                {order.status === "brief_submitted" ? "Brief sent" : "Paid, brief pending"}
              </Badge>
            </div>
            <p className="text-[length:calc(13px*var(--px,1))] text-muted-foreground">{formatDate(order.createdAt, true)}</p>
            <p className="mt-2 break-words">
              {order.customerName ?? "Name pending"}, {order.email ?? "email pending"}
            </p>
            {order.businessName && <p className="break-words">{order.businessName}</p>}
            {order.websiteUrl && <OrderLink url={order.websiteUrl} />}
            {order.product && <p className="mt-2 break-words">Product: {order.product}</p>}
            {order.audience && <p className="break-words">Audience: {order.audience}</p>}
            {order.creativeInstructions ? (
              <p className="mt-2 break-words whitespace-pre-wrap text-muted-foreground">{order.creativeInstructions}</p>
            ) : (
              <p className="mt-2 text-[length:calc(13px*var(--px,1))] text-muted-foreground">Brief not sent yet.</p>
            )}
            {order.assetUrl && (
              <p className="mt-2 text-[length:calc(13px*var(--px,1))] break-all">
                <span className="text-muted-foreground">Assets: </span>
                <OrderLink url={order.assetUrl} inline />
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A web address the customer typed, as a real link (admin audit 2026-11-12: they were blue text you could not click).
 * Only http and https become links; anything else shows as plain text.
 */
function OrderLink({ url, inline = false }: { url: string; inline?: boolean }) {
  const href = websiteHref(url);
  const text = "text-[length:calc(13px*var(--px,1))] break-all";
  if (!href) return inline ? <span className={text}>{url}</span> : <p className={text}>{url}</p>;
  const link = (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${text} text-primary hover:underline`}>
      {url}
    </a>
  );
  return inline ? link : <p>{link}</p>;
}
