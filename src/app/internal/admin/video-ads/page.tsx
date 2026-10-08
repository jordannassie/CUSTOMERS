import Link from "next/link";
import { requireAdmin } from "@/lib/admin/require";
import { listRecentOrders } from "@/modules/video-ads/dal";

export const metadata = { title: "Video ad orders | Admin", robots: { index: false } };

function money(cents: number) {
  return `$${cents / 100}`;
}

export default async function VideoAdOrdersPage() {
  await requireAdmin();
  const { orders, unavailable } = await listRecentOrders();

  return (
    <div className="p-6 sm:p-8 max-w-3xl">
      <h1 className="text-[24px] font-bold text-[#111827]">AI video ad orders</h1>
      <p className="mt-2 text-[14px] text-[#6B7280]">
        Paid briefs also appear in{" "}
        <Link href="/internal/admin/leads" className="font-semibold text-[#0866F5]">
          Leads
        </Link>{" "}
        with source AI Video Ads.
      </p>
      {unavailable ? (
        <p className="mt-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[14px] text-[#92400E]">
          The video_ad_orders table is not available yet. Apply migration 024. Until then, read the briefs in Leads.
        </p>
      ) : null}
      {orders.length === 0 && !unavailable ? (
        <p className="mt-6 text-[14px] text-[#6B7280]">No video ad orders yet.</p>
      ) : null}
      <ul className="mt-6 flex flex-col gap-4">
        {orders.map((order) => (
          <li key={order.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="text-[13px] font-semibold text-[#111827]">
              {order.packageId} · {money(order.amountCents)} · {order.status.replace("_", " ")}
            </p>
            <p className="mt-1 text-[12px] text-[#6B7280]">{order.createdAt.slice(0, 16).replace("T", " ")} UTC</p>
            <p className="mt-3 text-[14px] text-[#111827]">
              {order.customerName ?? "Name pending"} · {order.email ?? "Email pending"}
            </p>
            {order.businessName ? <p className="text-[14px] text-[#111827]">{order.businessName}</p> : null}
            {order.websiteUrl ? (
              <p className="text-[13px] break-all text-[#0866F5]">{order.websiteUrl}</p>
            ) : null}
            {order.product ? <p className="mt-2 text-[14px] text-[#111827]">Product: {order.product}</p> : null}
            {order.audience ? <p className="text-[14px] text-[#111827]">Audience: {order.audience}</p> : null}
            {order.creativeInstructions ? (
              <p className="mt-2 whitespace-pre-wrap text-[14px] text-[#374151]">{order.creativeInstructions}</p>
            ) : (
              <p className="mt-2 text-[13px] text-[#92400E]">Brief not submitted yet.</p>
            )}
            {order.assetUrl ? <p className="mt-2 break-all text-[13px] text-[#0866F5]">{order.assetUrl}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
