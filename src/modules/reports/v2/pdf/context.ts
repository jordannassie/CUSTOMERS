import type { ReportSnapshot } from "../snapshot-schema";
import type { PageProbe, SectionPages } from "./layout";
import type { Measure } from "./measure";

/** An agency logo react-pdf can draw (PNG or JPEG only). */
export type PdfLogo = { data: Buffer; format: "png" | "jpg" } | null;

/** What every page component gets. */
export interface ReportCtx {
  snapshot: ReportSnapshot;
  /** The agency accent, checked to be a hex colour. */
  accent: string;
  /** "Sep 29 to Oct 28, 2026". */
  period: string;
  /** Start page of each section, for the contents list and "All fixes start on page 5". */
  pages: SectionPages;
  probe: PageProbe;
  logo: PdfLogo;
  /** Measures text in Inter, for the fix card line limits; null falls back to a character count. */
  measure: Measure | null;
}

/** Reads the image type from its first bytes; anything other than PNG or JPEG gets the placeholder instead. */
export function toPdfLogo(logo: Buffer | null | undefined): PdfLogo {
  if (!logo || logo.length < 4) return null;
  if (logo[0] === 0x89 && logo[1] === 0x50 && logo[2] === 0x4e && logo[3] === 0x47) return { data: logo, format: "png" };
  if (logo[0] === 0xff && logo[1] === 0xd8 && logo[2] === 0xff) return { data: logo, format: "jpg" };
  return null;
}
