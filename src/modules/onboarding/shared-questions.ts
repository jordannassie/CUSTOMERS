// Questions shared with another business of the same kind in the same city (BUG-116, A8): with no library, two
// bookstores in one city get the same general questions, so their results can be compared. Split from questions.ts.
import { balancePicks, hasPlaceholder, isGeneralQuestion, type PreparedQuestion } from "./question-rules";
import type { QuestionBusiness, QuestionClients } from "./questions";

/** The general questions kept from a neighbour's set come first; the rest is written from this business's own services. */
export function withShared(shared: PreparedQuestion[], own: PreparedQuestion[], services: string[]): PreparedQuestion[] {
  if (shared.length === 0) return own;
  const entry = (q: PreparedQuestion) => ({ template: q.text, tags: [] as string[], intent: q.intent });
  return balancePicks(shared.map(entry), [...shared, ...own].map(entry), services).map((q) => ({ text: q.template, intent: q.intent, templateId: null }));
}

export async function sharedQuestions(business: QuestionBusiness, clients: QuestionClients): Promise<PreparedQuestion[]> {
  const kind = business.industryText?.trim() || business.industry?.trim();
  if (!clients.loadShared || !kind || kind === "other") return [];
  const all = await clients.loadShared(kind, business.city, business.region);
  // Only questions that fit any business of the kind: "a bookstore with a coffee shop" stays with the shop it was
  // written for even when this one lists coffee too, since the rest is written from this business's own services.
  const general = all
    .filter((q) => isGeneralQuestion(q.text, kind, business.city, business.region, []) && !hasPlaceholder(q.text))
    .map((q) => ({ template: q.text, tags: [] as string[], intent: q.intent }));
  // The same intent mix as any other set.
  return balancePicks(general, general, business.services).map((q) => ({ text: q.template, intent: q.intent, templateId: null }));
}
