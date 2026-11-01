// Setup with a different website, or a different name and city for a business without one, is a different
// business: what was filled in, chosen and read for the old one must not carry over. Pure.

export type DraftIdentity = { domain: string | null; hasWebsite: boolean | null; name: string; city: string | null };
export type NewIdentity = { domain: string } | { name: string; city: string };

const plain = (s: string | null | undefined) => (s ?? "").trim().toLowerCase().replace(/^www\./, "").replace(/\s+/g, " ");

/** True when the draft now describes another business, so it starts over from the details step. */
export function isAnotherBusiness(draft: DraftIdentity, next: NewIdentity): boolean {
  if ("domain" in next) return draft.hasWebsite === false || plain(draft.domain) !== plain(next.domain);
  return draft.hasWebsite !== false || plain(draft.name) !== plain(next.name) || plain(draft.city) !== plain(next.city);
}
