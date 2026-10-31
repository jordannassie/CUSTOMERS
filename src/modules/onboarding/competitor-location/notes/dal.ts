import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { checkNearNote, needsNearCheck, removedNote } from "../service";

// The notes the competitor list shows after the business moved (see ../dal.ts). Kept apart from ../dal.ts so the competitor
// step can read and clear them without importing the Places lookups that ../dal.ts needs from it.

export type LocationNotes = {
  /** "We removed 2 competitors from Austin. The suggestions below are near Dallas.", until the list is saved. */
  removed: string | null;
  /** The line under one saved competitor, or null when it needs none. */
  forCompetitor: (row: { placesId: string | null; createdAt: string }) => string | null;
};

export async function loadLocationNotes(businessId: string): Promise<LocationNotes> {
  const { data, error } = await createServiceClient()
    .from("businesses")
    .select("primary_city, location_changed_at, competitors_removed, competitors_removed_from")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw new Error(`Could not load the competitors note: ${error.message}`);
  const city = data?.primary_city?.trim() || null;
  const changedAt = data?.location_changed_at ?? null;
  return {
    removed: data?.competitors_removed ? removedNote(data.competitors_removed, data.competitors_removed_from ?? [], city) : null,
    forCompetitor: (row) => (city && needsNearCheck(row, changedAt) ? checkNearNote(city) : null),
  };
}

/** The user saved the competitor list: they have seen the note and checked the list for the new place. */
export async function clearLocationNotes(businessId: string): Promise<void> {
  const { error } = await createServiceClient()
    .from("businesses")
    .update({ location_changed_at: null, competitors_removed: null, competitors_removed_from: null })
    .eq("id", businessId)
    .or("location_changed_at.not.is.null,competitors_removed.not.is.null");
  if (error) throw new Error(`Could not clear the competitors note: ${error.message}`);
}
