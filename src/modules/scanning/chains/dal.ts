import "server-only";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/service";
import { branchOf, chainName } from "../branch";

// A tracked branch ("Bennu Coffee on Congress") counts every answer that names its chain (BUG-097). Read from the
// saved answers when a page is shown, so nothing new is stored: for each branch that AI named, whether most of those
// answers named only the chain. Callers check the user may see this business first.
const PAGE = 1000;

/** Per competitor, in order: the chain's name when its score is the chain's, else null. */
export async function loadChains(
  businessId: string,
  competitors: { name: string; city: string | null; score: number }[],
  since: Date,
): Promise<(string | null)[]> {
  return Promise.all(
    competitors.map(({ name, city, score }) =>
      score > 0 && branchOf(name, city)
        ? branchAnswers(businessId, name, since.getTime()).then((answers) => chainName(name, city, answers))
        : null,
    ),
  );
}

// React's cache lasts one server request, like the score report that calls this.
const branchAnswers = cache(async (businessId: string, name: string, sinceMs: number): Promise<string[]> => {
  const answers: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await createServiceClient()
      .from("visibility_results_counted")
      .select("answer_text")
      .eq("business_id", businessId)
      .gt("created_at", new Date(sinceMs).toISOString())
      .contains("competitors_mentioned", JSON.stringify([{ name }]))
      .order("created_at")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Chains: could not read the answers that named ${name}: ${error.message}`);
    for (const r of data) if (r.answer_text) answers.push(r.answer_text);
    if (data.length < PAGE) break;
  }
  return answers;
});
