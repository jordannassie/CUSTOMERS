import { NextResponse, type NextRequest } from "next/server";
import { processStripeWebhook } from "@/modules/billing";

// Public endpoint: the Stripe signature is the auth (B-42, MVP_SPEC 11.3). The raw body is needed to verify it.
// Runs on Node.js, the default; cacheComponents does not allow a runtime export here.
export async function POST(request: NextRequest) {
  const result = await processStripeWebhook(await request.text(), request.headers.get("stripe-signature"));
  return NextResponse.json(result.body, { status: result.status });
}
