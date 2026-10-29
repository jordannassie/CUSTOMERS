// How a question names the place (BUG-085). "Austin, TX" reads naturally; "Islamabad, Islamabad Capital Territory"
// or "Rawalpindi, Punjab" does not, so a region is added only when it is a short code. The full region still
// reaches the AI as user_location (D-67).
export function placeLabel(city: string, region: string | null | undefined): string {
  const r = region?.trim() ?? "";
  return /^[A-Z]{2,3}$/.test(r) ? `${city.trim()}, ${r}` : city.trim();
}
