import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { briefLeadMessage, mirrorLead } from "./lead-mirror";
import { getVideoAdPackage, type VideoAdPackageId } from "./packages";

export type VideoAdBrief = {
  customerName: string;
  email: string;
  businessName: string;
  websiteUrl: string;
  product: string;
  audience: string;
  creativeInstructions: string;
  assetUrl: string | null;
};

export type VideoAdOrder = {
  id: string;
  stripeCheckoutSessionId: string;
  packageId: string;
  amountCents: number;
  status: string;
  customerName: string | null;
  email: string | null;
  businessName: string | null;
  websiteUrl: string | null;
  product: string | null;
  audience: string | null;
  creativeInstructions: string | null;
  assetUrl: string | null;
  briefSubmittedAt: string | null;
  createdAt: string;
};

type OrderRow = {
  id: string;
  stripe_checkout_session_id: string;
  package_id: string;
  amount_cents: number;
  status: string;
  customer_name: string | null;
  email: string | null;
  business_name: string | null;
  website_url: string | null;
  product: string | null;
  audience: string | null;
  creative_instructions: string | null;
  asset_url: string | null;
  brief_submitted_at: string | null;
  created_at: string;
};

const ORDER_COLUMNS =
  "id, stripe_checkout_session_id, package_id, amount_cents, status, customer_name, email, business_name, website_url, product, audience, creative_instructions, asset_url, brief_submitted_at, created_at";

function mapRow(row: OrderRow): VideoAdOrder {
  return {
    id: row.id,
    stripeCheckoutSessionId: row.stripe_checkout_session_id,
    packageId: row.package_id,
    amountCents: row.amount_cents,
    status: row.status,
    customerName: row.customer_name,
    email: row.email,
    businessName: row.business_name,
    websiteUrl: row.website_url,
    product: row.product,
    audience: row.audience,
    creativeInstructions: row.creative_instructions,
    assetUrl: row.asset_url,
    briefSubmittedAt: row.brief_submitted_at,
    createdAt: row.created_at,
  };
}

function missingTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /video_ad_orders/i.test(error.message ?? "");
}

export async function getOrderBySession(sessionId: string): Promise<VideoAdOrder | null> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("video_ad_orders")
    .select(ORDER_COLUMNS)
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("[video-ads] read order:", error.code, error.message);
    return null;
  }
  return mapRow(data as OrderRow);
}

export async function recordPaidOrder(input: {
  sessionId: string;
  paymentIntentId: string | null;
  packageId: VideoAdPackageId;
  amountCents: number;
  email: string | null;
  customerName: string | null;
}) {
  const svc = createServiceClient();
  const existing = await getOrderBySession(input.sessionId);
  if (existing?.briefSubmittedAt) return;
  let orderSaved = Boolean(existing);
  if (!existing) {
    const { error } = await svc.from("video_ad_orders").insert({
      stripe_checkout_session_id: input.sessionId,
      stripe_payment_intent_id: input.paymentIntentId,
      package_id: input.packageId,
      amount_cents: input.amountCents,
      currency: "usd",
      status: "paid",
      email: input.email,
      customer_name: input.customerName,
    });
    orderSaved = !error || error.code === "23505";
    if (error && error.code !== "23505" && !missingTable(error)) {
      console.error("[video-ads] insert order:", error.message);
    }
  }

  let leadSaved = false;
  if (input.email) {
    const pack = getVideoAdPackage(input.packageId);
    leadSaved = await mirrorLead({
      sessionId: input.sessionId,
      name: input.customerName ?? "Video ad customer",
      email: input.email,
      businessName: null,
      websiteUrl: null,
      message: `Payment confirmed for ${pack?.name ?? input.packageId} ($${input.amountCents / 100}). Creative brief not submitted yet.`,
      mode: "payment",
    });
  }

  if (!orderSaved && !leadSaved) {
    throw new Error("Could not store the video ad order.");
  }
}

export async function saveBrief(input: {
  sessionId: string;
  paymentIntentId: string | null;
  packageId: VideoAdPackageId;
  amountCents: number;
  brief: VideoAdBrief;
}): Promise<{ already: boolean }> {
  const existing = await getOrderBySession(input.sessionId);
  if (existing?.briefSubmittedAt) return { already: true };

  const now = new Date().toISOString();
  const fields = {
    stripe_payment_intent_id: input.paymentIntentId,
    package_id: input.packageId,
    amount_cents: input.amountCents,
    currency: "usd",
    status: "brief_submitted",
    customer_name: input.brief.customerName,
    email: input.brief.email,
    business_name: input.brief.businessName,
    website_url: input.brief.websiteUrl,
    product: input.brief.product,
    audience: input.brief.audience,
    creative_instructions: input.brief.creativeInstructions,
    asset_url: input.brief.assetUrl,
    brief_submitted_at: now,
    updated_at: now,
  };

  const svc = createServiceClient();
  const { error } = existing
    ? await svc.from("video_ad_orders").update(fields).eq("id", existing.id).is("brief_submitted_at", null)
    : await svc.from("video_ad_orders").insert({
        ...fields,
        stripe_checkout_session_id: input.sessionId,
      });

  const orderSaved = !error || error.code === "23505";
  if (error && error.code !== "23505" && !missingTable(error)) {
    console.error("[video-ads] save brief:", error.message);
  }

  const leadSaved = await mirrorLead({
    sessionId: input.sessionId,
    name: input.brief.customerName,
    email: input.brief.email,
    businessName: input.brief.businessName,
    websiteUrl: input.brief.websiteUrl,
    message: briefLeadMessage(input.packageId, input.amountCents, input.brief),
    mode: "brief",
  });

  if (!orderSaved && !leadSaved) {
    throw new Error("Could not save the creative brief.");
  }
  return { already: false };
}

export async function listRecentOrders(): Promise<{ orders: VideoAdOrder[]; unavailable: boolean }> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("video_ad_orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("[video-ads] list orders:", error.code, error.message);
    return { orders: [], unavailable: missingTable(error) };
  }
  return { orders: (data as OrderRow[]).map(mapRow), unavailable: false };
}
