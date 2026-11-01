import type { ReportSnapshot } from "../snapshot-schema";

// Which page each section starts on. Computed from the snapshot (one page per section, the fix cards two to a page),
// then checked against where the sections really landed: render.ts draws again with the real numbers if a long text
// ever pushed a section onto an extra page, so the contents list is always right.

export const SECTIONS = [
  { key: "summary", title: "Summary", label: "Summary" },
  { key: "knows", title: "What AI knows about you", label: "What AI knows about you" },
  { key: "behind", title: "Why you are behind", label: "Why you are behind" },
  { key: "plan", title: "Action plan and where to fix", label: "Action plan" },
  { key: "roadmap", title: "90 day roadmap", label: "90 day roadmap" },
  { key: "method", title: "Method and glossary", label: "Method and glossary" },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];
export type SectionPages = Record<SectionKey, number>;

export const FIXES_PER_PAGE = 2;

export const fixPageCount = (snapshot: ReportSnapshot) => Math.ceil(snapshot.fixes.length / FIXES_PER_PAGE);

/** The start page of each section, and the total, when every section fits its pages (the normal case). */
export function expectedLayout(snapshot: ReportSnapshot): { pages: SectionPages; total: number } {
  const plan = 5;
  const roadmap = plan + fixPageCount(snapshot) + 1;
  const pages: SectionPages = { summary: 2, knows: 3, behind: 4, plan, roadmap, method: roadmap + 1 };
  return { pages, total: pages.method };
}

/** "01" for the first section. */
export const sectionNumber = (key: SectionKey) =>
  String(SECTIONS.findIndex((x) => x.key === key) + 1).padStart(2, "0");

/** Collects the page each section label was drawn on, from react-pdf's final pass (the one that knows totalPages). */
export class PageProbe {
  readonly seen: Partial<SectionPages> = {};

  record(key: SectionKey, pageNumber: number, totalPages: number | undefined): void {
    if (totalPages === undefined) return;
    const prev = this.seen[key];
    this.seen[key] = prev === undefined ? pageNumber : Math.min(prev, pageNumber);
  }

  /** True when every section landed where `pages` said it would. */
  matches(pages: SectionPages): boolean {
    return SECTIONS.every(({ key }) => this.seen[key] === undefined || this.seen[key] === pages[key]);
  }

  merged(pages: SectionPages): SectionPages {
    return { ...pages, ...this.seen };
  }
}

const BOLD_22_PT_PER_CHAR = 10.5;

/**
 * A max width that splits a long headline into even lines (like CSS text-wrap: balance), estimated from Inter Bold's
 * average glyph width. Short headlines keep the full width.
 */
export function balancedWidth(text: string, fullWidth: number, ptPerChar = BOLD_22_PT_PER_CHAR): number {
  const width = text.length * ptPerChar;
  if (width <= fullWidth - 12) return fullWidth;
  const lineCount = Math.ceil(width / (fullWidth - 12));
  return Math.min(fullWidth, Math.round(width / lineCount + 40));
}
