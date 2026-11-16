// How a question names the place (BUG-085). "Austin, TX" reads naturally; "Islamabad, Islamabad Capital Territory"
// or "Rawalpindi, Punjab" does not, so a region is added only when it is a short code. The full region still
// reaches the AI as user_location (D-67).
export function placeLabel(city: string, region: string | null | undefined): string {
  const c = city.trim();
  const r = region?.trim() ?? "";
  // A city typed as "Austin, TX" already names its state: adding it again gave "Austin, TX, TX" (2026-11-16).
  if (r && c.toLowerCase().endsWith(`, ${r.toLowerCase()}`)) return c;
  return /^[A-Z]{2,3}$/.test(r) ? `${c}, ${r}` : c;
}

/**
 * "Austin, TX" typed into one city box: the city and a short state code, when no state was given separately. Other
 * text, such as "Rawalpindi, Punjab" with a long region, is kept whole as the city.
 */
export function splitCityState(city: string, region: string | null | undefined): { city: string; region: string | null } {
  const c = city.trim();
  const r = region?.trim() || null;
  const match = /^(.+?),\s*([A-Za-z]{2})$/.exec(c);
  if (!match || (r && r.toUpperCase() !== match[2].toUpperCase())) return { city: c, region: r };
  return { city: match[1].trim(), region: match[2].toUpperCase() };
}
