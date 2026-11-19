import "server-only";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentUser } from "@/modules/auth";
import { priceCall, type PricedCall } from "./service";

// Records what each paid Google Places or Firecrawl request cost, in usage_events next to the AI costs (owner,
// 2026-11-17), so the admin Usage and cost page shows the whole bill. Only the price and which kind of call it was are
// kept: nothing Google or the website returned (D-73).

/** usage_events.usage_type: Places has its own; Firecrawl goes under "other" with its provider name. */
const USAGE_TYPE: Record<PricedCall["service"], string> = { google_places: "google_places", firecrawl: "other" };

// Written straight away, not with next/server's after(): the scan worker is bundled outside Next and can't load it
// (worker-bundle.test.ts). One small insert next to a Google or Firecrawl call that takes far longer. A failed write
// never fails the call it describes.
async function record(call: PricedCall, userId: string | null): Promise<void> {
  try {
    await insert(call, userId);
  } catch (e) {
    console.error(`Could not record the ${call.service} cost: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function insert(call: PricedCall, userId: string | null): Promise<void> {
  const { error } = await createServiceClient().from("usage_events").insert({
    account_user_id: userId,
    usage_type: USAGE_TYPE[call.service],
    provider: call.service,
    model: call.sku,
    estimated_cost_usd: call.usd,
    metadata: { service: call.service, sku: call.sku },
  });
  if (error) console.error(`Could not record the ${call.service} cost: ${error.message}`);
}

/** The signed-in user the call was made for, so the cost lands on their agency; none in background jobs. */
async function currentUserId(): Promise<string | null> {
  try {
    return (await getCurrentUser())?.id ?? null;
  } catch {
    return null;
  }
}

const fieldMaskOf = (init: RequestInit | undefined): string | null => {
  const headers = new Headers(init?.headers);
  return headers.get("x-goog-fieldmask");
};

/**
 * fetch, plus a cost row for each answered call to a paid service. A refused (429) or failed (5xx) call is not billed
 * by Google or Firecrawl, so only 2xx and 404 answers are counted; a 404 is a billed lookup that found nothing.
 */
export function meteredFetch(base: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const res = await base(input, init);
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const billed = (res.status >= 200 && res.status < 300) || res.status === 404;
    const priced = billed ? priceCall(url, fieldMaskOf(init), env.FIRECRAWL_USD_PER_CREDIT) : null;
    if (priced) {
      await record(priced, await currentUserId());
    }
    return res;
  };
}
