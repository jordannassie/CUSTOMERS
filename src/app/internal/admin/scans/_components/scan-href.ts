import type { ScanListQuery } from "@/modules/admin";

export const SCANS_BASE = "/internal/admin/scans";

/** The Scans address with these filters, keeping the others; page 1 unless a page is given. Pure, so the server
 * list and the client filter bar build the same links. */
export function scansHref(query: ScanListQuery, change: Partial<Record<keyof ScanListQuery, string | number | undefined>> = {}): string {
  const next = { ...query, page: undefined, ...change } as Record<string, string | number | undefined>;
  const params = new URLSearchParams();
  for (const key of ["status", "from", "to", "agency", "business", "page"]) {
    const value = next[key];
    if (value === undefined || value === "" || (key === "page" && Number(value) <= 1)) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${SCANS_BASE}?${qs}` : SCANS_BASE;
}
