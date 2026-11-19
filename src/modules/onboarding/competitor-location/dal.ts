import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { recountAfterNamesChange } from "@/modules/scanning";
import type { CompetitorPlaces, PlaceArea } from "../competitor-places";
import { liveCompetitorPlaces } from "../competitor-step/dal";
import { anyChange, isOutside, locationChange, oldPlaceName, type BusinessLocation } from "./service";

// Every function here is called after the caller checked the business is the user's; writes use the service role,
// as users cannot write competitors themselves (migration 047, SEC-10).

/** The saved city, region and country, read before a save that may change them. */
export async function savedLocation(businessId: string): Promise<BusinessLocation | null> {
  const { data, error } = await createServiceClient()
    .from("businesses")
    .select("primary_city, primary_region, primary_country")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw new Error(`Could not load the business location: ${error.message}`);
  return data && { city: data.primary_city, region: data.primary_region, country: data.primary_country };
}

/**
 * After a save: when the city, region or country changed, the competitors picked from Google that are somewhere else
 * are removed, and the competitor list says so once. Each one's place is read live, once (D-73); when Google cannot
 * say where one is, it stays. Competitors added by name stay, flagged for the user to check. `recount: false` leaves
 * checking saved answers again to a caller that does it anyway.
 */
export async function keepCompetitorsNear(
  businessId: string,
  before: BusinessLocation | null,
  { places = liveCompetitorPlaces(), recount = true }: { places?: CompetitorPlaces; recount?: boolean } = {},
): Promise<{ removed: number }> {
  const none = { removed: 0 };
  if (!before) return none;
  const db = createServiceClient();
  const { data: b, error } = await db
    .from("businesses")
    .select("primary_city, primary_region, primary_country, competitors_removed, competitors_removed_from")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw new Error(`Could not load the business location: ${error.message}`);
  if (!b) return none;
  const now = { city: b.primary_city, region: b.primary_region, country: b.primary_country };
  const change = locationChange(before, now);
  if (!anyChange(change)) return none;

  const rows = await db.from("business_competitors").select("id, places_id, place_id").eq("business_id", businessId);
  if (rows.error) throw new Error(`Could not load competitors: ${rows.error.message}`);
  if (!rows.data.length) return none;

  // place_id is where older code kept the id. One lookup per place, never more than there are competitors.
  const placeOf = (r: { places_id: string | null; place_id: string | null }) => r.places_id ?? r.place_id;
  const ids = [...new Set(rows.data.flatMap((r) => placeOf(r) ?? []))];
  const areas = new Map<string, PlaceArea>();
  if (places.area) {
    const lookup = places.area;
    const found = await Promise.all(ids.map(async (id) => [id, await lookup(id).catch(() => null)] as const));
    for (const [id, area] of found) if (area) areas.set(id, area);
  }
  const remove = rows.data.filter((r) => {
    const id = placeOf(r);
    const area = id ? areas.get(id) : undefined;
    return area ? isOutside(area, now, change) : false;
  });
  const typedLeft = rows.data.some((r) => !placeOf(r));

  if (remove.length) {
    const { error: deleteError } = await db.from("business_competitors").delete().in("id", remove.map((r) => r.id)).eq("business_id", businessId);
    if (deleteError) throw new Error(`Could not remove competitors: ${deleteError.message}`);
  }
  if (remove.length || typedLeft) {
    const from = oldPlaceName(before);
    const previous = b.competitors_removed_from ?? [];
    const { error: noteError } = await db
      .from("businesses")
      .update({
        ...(typedLeft ? { location_changed_at: new Date().toISOString() } : {}),
        ...(remove.length
          ? {
              competitors_removed: (b.competitors_removed ?? 0) + remove.length,
              competitors_removed_from: from && !previous.includes(from) ? [...previous, from] : previous,
            }
          : {}),
      })
      .eq("id", businessId);
    if (noteError) throw new Error(`Could not save the competitors note: ${noteError.message}`);
  }
  // Saved answers are checked again without the removed names, like any other change to the list.
  if (remove.length && recount) await recountAfterNamesChange(businessId);
  return { removed: remove.length };
}
