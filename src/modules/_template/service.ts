// Pure rules only: no framework, database or env imports, so it is easy to unit test.
export const MAX_BUSINESS_NAME = 120;

export function cleanBusinessName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name || name.length > MAX_BUSINESS_NAME) return null;
  return name;
}
