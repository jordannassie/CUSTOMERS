import type { ScanListQuery } from "@/modules/admin";

export const SCANS_BASE = "/internal/admin/scans";

/** The Scans address with these filters, keeping the others; page 1 unless a page is given. Pure, so the server
 * list and the client filter bar build the same links. Real or test agencies only (from the Overview) is kept too;
 * "all" is the default and stays out of the address. */
export function scansHref(query: ScanListQuery, change: Partial<Record<keyof ScanListQuery, string | number | undefined>> = {}): string {
  const next = { ...query, page: undefined, ...change } as Record<string, string | number | undefined>;
  const params = new URLSearchParams();
  for (const key of ["status", "from", "to", "agency", "business", "test", "page"]) {
    const value = next[key];
    if (value === undefined || value === "" || (key === "page" && Number(value) <= 1) || (key === "test" && value === "all")) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${SCANS_BASE}?${qs}` : SCANS_BASE;
}

/** Whether any filter is on: status, agency, business, dates, or real or test agencies only. */
export function hasFilters(query: ScanListQuery): boolean {
  return Boolean(query.status || query.from || query.to || query.agency || query.business || query.test !== "all");
}

/** The address with every filter but status cleared; the status tabs stay as they are. */
export const CLEAR_FILTERS = { from: undefined, to: undefined, agency: undefined, business: undefined, test: "all" } as const;
