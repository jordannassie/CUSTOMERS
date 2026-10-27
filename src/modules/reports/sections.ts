// The client report's sections (dashboard redesign, 7. Reports): always in this order, and the agency can hide any of
// them for a business. A hidden section is left out of the Reports page, the share link and the PDF alike. Pure.
import { z } from "zod";

export const SECTIONS = ["summary", "models", "competitors", "questions", "sources", "actions", "method"] as const;
export type SectionId = (typeof SECTIONS)[number];

export const SECTION_TITLES: Record<SectionId, string> = {
  summary: "Summary",
  models: "Score by AI tool",
  competitors: "Competitors",
  questions: "Questions",
  sources: "Where AI looks",
  actions: "Action plan",
  method: "How we measure",
};

/** businesses.report_settings: only the hidden sections are kept, so a section added later shows by default. */
export const reportSettingsSchema = z.object({ hidden: z.array(z.enum(SECTIONS)).max(SECTIONS.length) });
export type ReportSettings = z.infer<typeof reportSettingsSchema>;

/** Whatever is stored, a usable setting: unknown or broken values hide nothing. */
export function parseReportSettings(json: unknown): ReportSettings {
  const hidden = z.object({ hidden: z.array(z.unknown()) }).safeParse(json);
  if (!hidden.success) return { hidden: [] };
  const known = new Set<string>(SECTIONS);
  return { hidden: SECTIONS.filter((s) => hidden.data.hidden.includes(s) && known.has(s)) };
}

/** The sections to show, in the fixed order, whatever order `hidden` lists them in. */
export function visibleSections(hidden: readonly SectionId[]): SectionId[] {
  return SECTIONS.filter((s) => !hidden.includes(s));
}

/** Hiding every section leaves an empty page, so at least one stays on. */
export function canHide(hidden: readonly SectionId[], section: SectionId): boolean {
  return hidden.includes(section) || visibleSections(hidden).length > 1;
}

/** "1 · Summary": the number is the section's place among the ones shown. */
export function sectionNumbers(hidden: readonly SectionId[]): Partial<Record<SectionId, number>> {
  return Object.fromEntries(visibleSections(hidden).map((s, i) => [s, i + 1]));
}
