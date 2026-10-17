import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/modules/auth";
import { libraryGaps, type LibraryGap } from "./service";

/** Industries of live businesses (test agencies left out) that have no active library templates. */
export async function loadLibraryGaps(): Promise<LibraryGap[]> {
  await requireAdmin();
  const db = createServiceClient();
  const [businesses, library] = await Promise.all([
    db.from("businesses").select("industry, agencies!inner(is_test)").is("deleted_at", null).eq("agencies.is_test", false),
    db.from("question_library").select("industry").eq("active", true),
  ]);
  if (businesses.error) throw new Error(`Could not load business industries: ${businesses.error.message}`);
  if (library.error) throw new Error(`Could not load the question library: ${library.error.message}`);
  return libraryGaps(
    businesses.data.map((b) => b.industry),
    new Set(library.data.map((l) => l.industry)),
  );
}
