import "server-only";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/service";

// One read per server render of the rows every Overview section needs (perf fix #3, 2026-11-13). The Overview's
// sections each read the business, its competitors and its questions with their own column lists: about 20 calls for
// three rows. These readers take the union of those columns once per render (React's cache); each caller gets its own
// copy, so no section can change another's data. React's cache only applies while a page renders: in Server Actions,
// route handlers and the scan worker every call reads again, so a write is never followed by a stale read.
// Callers check the user may see this agency first.

export const BUSINESS_COLUMNS =
  "id, agency_id, name, domain, aliases, phone, has_website, primary_city, primary_region, models, places_id, is_chain";
export const COMPETITOR_COLUMNS = "id, name, domain, aliases, phone, city, places_id, place_id, created_at, checked_from";
export const QUESTION_COLUMNS = "id, prompt, source, active, inactive_since";

export type BusinessRow = {
  id: string;
  agency_id: string | null;
  name: string;
  domain: string | null;
  aliases: string[];
  phone: string | null;
  has_website: boolean | null;
  primary_city: string | null;
  primary_region: string | null;
  models: string[];
  places_id: string | null;
  is_chain: boolean;
};

export type CompetitorRow = {
  id: string;
  name: string;
  domain: string | null;
  aliases: string[];
  phone: string | null;
  city: string | null;
  places_id: string | null;
  place_id: string | null;
  created_at: string;
  checked_from: string | null;
};

export type QuestionRow = { id: string; prompt: string; source: string; active: boolean; inactive_since: string | null };

/** The same shape as a Supabase result, so callers keep their own error handling. */
export type ReadResult<T> = { data: T; error: { message: string } | null };

const businessOnce = cache(async (businessId: string, agencyId: string): Promise<ReadResult<BusinessRow | null>> => {
  const { data, error } = await createServiceClient()
    .from("businesses")
    .select(BUSINESS_COLUMNS)
    .eq("id", businessId)
    .eq("agency_id", agencyId)
    .maybeSingle();
  return { data: (data as BusinessRow | null) ?? null, error };
});

const competitorsOnce = cache(async (businessId: string): Promise<ReadResult<CompetitorRow[] | null>> => {
  const { data, error } = await createServiceClient()
    .from("business_competitors")
    .select(COMPETITOR_COLUMNS)
    .eq("business_id", businessId)
    .order("created_at");
  return { data: (data as CompetitorRow[] | null) ?? null, error };
});

// Stopped questions too, for past scores; callers that show the active ones filter on `active` themselves.
const questionsOnce = cache(async (businessId: string): Promise<ReadResult<QuestionRow[] | null>> => {
  const { data, error } = await createServiceClient()
    .from("tracked_prompts")
    .select(QUESTION_COLUMNS)
    .eq("business_id", businessId)
    .order("created_at");
  return { data: (data as QuestionRow[] | null) ?? null, error };
});

/** The agency's business (null data when it is not the agency's), with every column the Overview's sections use. */
export async function readBusiness(businessId: string, agencyId: string): Promise<ReadResult<BusinessRow | null>> {
  const { data, error } = await businessOnce(businessId, agencyId);
  return { data: data ? { ...data, aliases: [...data.aliases], models: [...data.models] } : null, error };
}

/** The business's tracked competitors, oldest first. */
export async function readCompetitors(businessId: string): Promise<ReadResult<CompetitorRow[] | null>> {
  const { data, error } = await competitorsOnce(businessId);
  return { data: data ? data.map((c) => ({ ...c, aliases: [...c.aliases] })) : null, error };
}

/** Every question of the business, stopped ones included, oldest first. */
export async function readQuestions(businessId: string): Promise<ReadResult<QuestionRow[] | null>> {
  const { data, error } = await questionsOnce(businessId);
  return { data: data ? data.map((q) => ({ ...q })) : null, error };
}
