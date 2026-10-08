import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { BriefForm } from "@/components/site/video-ads/BriefForm";
import { getOrderBySession, recordPaidOrder } from "@/modules/video-ads/dal";
import { briefTokensMatch, checkoutSessionIdSchema } from "@/modules/video-ads/schema";
import { loadPaidVideoAdSession } from "@/modules/video-ads/verify-session";

export const metadata: Metadata = {
  title: "Your video ad order",
  robots: { index: false, follow: false },
};

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E5E1] bg-white p-8">
      <h1 className="text-[28px] font-bold tracking-tight text-[#171717]">{title}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[#777773]">{body}</p>
      <Link href="/ads" className="mt-6 inline-flex text-[15px] font-semibold text-[#0866F5]">
        Back to AI Video Ads
      </Link>
    </div>
  );
}

export default async function VideoAdBriefPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; token?: string }>;
}) {
  const params = await searchParams;
  const sessionId = checkoutSessionIdSchema.safeParse(params.session_id);
  const token = params.token ?? "";

  let body = (
    <Notice
      title="No confirmed order on this page."
      body="This page opens from the link Stripe sends after a successful payment."
    />
  );

  if (sessionId.success) {
    const paid = await loadPaidVideoAdSession(sessionId.data);
    if (!paid.ok) {
      body = (
        <Notice
          title={paid.reason === "unavailable" ? "Checkout is not connected." : "Payment is not confirmed."}
          body={
            paid.reason === "unavailable"
              ? "We can't confirm a payment until Stripe is connected. If you were charged, contact us and we will look up the payment in Stripe."
              : "We could not confirm a paid order for this link. If money left your account, contact us with the time of the charge."
          }
        />
      );
    } else if (!briefTokensMatch(paid.session.briefToken, token)) {
      body = (
        <Notice
          title="This order link is not valid."
          body="Open the link from the Stripe confirmation page to send your brief."
        />
      );
    } else {
      try {
        await recordPaidOrder({
          sessionId: sessionId.data,
          paymentIntentId: paid.session.paymentIntentId,
          packageId: paid.session.pack.id,
          amountCents: paid.session.pack.amountCents,
          email: paid.session.email,
          customerName: paid.session.customerName,
        });
      } catch (error) {
        console.error("[video-ads] record on brief page:", error instanceof Error ? error.message : "unknown");
      }

      const order = await getOrderBySession(sessionId.data);
      body = order?.briefSubmittedAt ? (
        <Notice
          title="We have your order."
          body={`Payment for the ${paid.session.pack.name} package (${paid.session.pack.priceLabel}) is confirmed, and your brief is saved. We'll confirm your production timeline when your order is accepted.`}
        />
      ) : (
        <BriefForm
          sessionId={sessionId.data}
          token={token}
          packageName={paid.session.pack.name}
          priceLabel={paid.session.pack.priceLabel}
          defaultName={paid.session.customerName ?? ""}
          defaultEmail={paid.session.email ?? ""}
        />
      );
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-[#FAFAF8] px-4 pb-20 pt-28 sm:px-6">
        <div className="mx-auto max-w-xl">{body}</div>
      </main>
      <SiteFooter />
    </>
  );
}
