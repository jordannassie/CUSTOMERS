// The Questions page's address, so every page links to it the same way. Pure and import-free.
//   q:     a question id; that question opens and scrolls into view
//   site:  a domain; only the questions whose answers in the last 30 days used it (subdomains count)
//   named: a business name; only the questions where AI named that business and not you

export type QuestionsLink = { q?: string | null; site?: string | null; named?: string | null };

export function questionsHref(link: QuestionsLink = {}): string {
  const params = new URLSearchParams();
  if (link.q) params.set("q", link.q);
  if (link.site) params.set("site", link.site);
  if (link.named) params.set("named", link.named);
  const query = params.toString();
  return query ? `/questions?${query}` : "/questions";
}
