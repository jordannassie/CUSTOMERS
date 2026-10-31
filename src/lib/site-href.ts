/** A link to a website from its saved address ("pizzahutpk.com"); null for anything that isn't a plain address. */
export function siteHref(domain: string | null | undefined): string | null {
  const d = domain?.trim().toLowerCase();
  return d && /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(d) ? `https://${d}` : null;
}
