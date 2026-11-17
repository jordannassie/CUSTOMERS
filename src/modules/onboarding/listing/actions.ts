"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { canEditTracking } from "@/modules/entitlements";
import { checkRateLimit } from "@/modules/rate-limit";
import { DUPLICATE_BUSINESS_TEXT } from "../duplicates";
import { placeIdPattern } from "../schema";
import { findListings, linkBusinessListing, linkCompetitorListing } from "./dal";
import type { LinkResult, ListingSearch } from "./service";

const target = { businessId: z.uuid(), competitorId: z.uuid().optional() };
const searchInput = z.object({ ...target, query: z.string().trim().max(120).optional() });
const linkInput = z.object({ ...target, placeId: z.string().regex(placeIdPattern) });

const SEARCH_LIMITED = "You've searched Google a lot this hour. Try again later.";
const SEARCH_DOWN = "We couldn't search Google just now. Try again in a few minutes.";
const REFUSED: Record<Exclude<LinkResult, "saved">, { status: 404 | 409; error: string }> = {
  not_found: { status: 404, error: "Business not found." },
  already_linked: { status: 409, error: "It's already linked to a Google listing. Reload the page to see it." },
  duplicate: { status: 409, error: DUPLICATE_BUSINESS_TEXT },
  your_listing: { status: 409, error: "That's your own Google listing. Pick the competitor's." },
  taken: { status: 409, error: "Another of your competitors already has that listing." },
};

async function editor(): Promise<{ agencyId: string; userId: string } | ActionResult<never>> {
  try {
    const { agency, user } = await requireAgency();
    const edit = canEditTracking(agency);
    if (!edit.allowed) return { ok: false, status: 403, error: edit.reason };
    return { agencyId: agency.id, userId: user.id };
  } catch (error) {
    return authFailure(error);
  }
}

/** "Link Google listing": a Google search for the business or a competitor. Each is paid, so it has an hourly limit. */
export async function searchListings(input: unknown): Promise<ActionResult<ListingSearch>> {
  const who = await editor();
  if ("ok" in who) return who;
  const parsed = searchInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Type a name to search for." };
  const limit = await checkRateLimit("competitor_lookup", who.userId);
  if (limit === "limited") return { ok: false, status: 429, error: SEARCH_LIMITED };
  if (limit === "unavailable") return { ok: false, status: 503, error: SEARCH_DOWN };
  const found = await findListings(who.agencyId, parsed.data, parsed.data.query);
  if (!found) return { ok: false, status: 404, error: "Business not found." };
  if (found.unavailable) return { ok: false, status: 503, error: SEARCH_DOWN };
  return { ok: true, data: found };
}

/** The owner's pick: only its place_id is saved (D-73), then the page shows its Google details. */
export async function linkListing(input: unknown): Promise<ActionResult<null>> {
  const who = await editor();
  if ("ok" in who) return who;
  const parsed = linkInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Pick a listing from the list." };
  const { businessId, competitorId, placeId } = parsed.data;
  const result = competitorId
    ? await linkCompetitorListing(who.agencyId, businessId, competitorId, placeId)
    : await linkBusinessListing(who.agencyId, businessId, placeId);
  if (result !== "saved") return { ok: false, ...REFUSED[result] };
  refresh();
  return { ok: true, data: null };
}
