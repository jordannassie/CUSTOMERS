import "server-only";
import { createElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { ReportSnapshot } from "../snapshot-schema";
import { toPdfLogo, type ReportCtx } from "./context";
import { registerFonts } from "./fonts";
import { formatPeriod } from "./format";
import { PageProbe, expectedLayout, type SectionPages } from "./layout";
import { loadMeasure } from "./measure";
import { ReportDocument } from "./ReportDocument";
import { safeAccent } from "./theme";

export interface RenderOptions {
  /** The agency logo bytes (PNG or JPEG); anything else, or none, draws a neutral placeholder. */
  logo?: Buffer | null;
}

export interface RenderResult {
  pdf: Buffer;
  /** Where each section really starts. */
  pages: SectionPages;
  /** Where the layout expected each section, from the snapshot alone. */
  expected: SectionPages;
  expectedTotal: number;
  /** True when a long text pushed a section onto an extra page and the contents had to be drawn again. */
  redrawn: boolean;
}

async function draw(ctx: ReportCtx): Promise<Buffer> {
  const doc = createElement(ReportDocument, { ctx }) as unknown as ReactElement<DocumentProps>;
  return renderToBuffer(doc);
}

/** Draws the report and says where each section landed. Used by renderReportPdf and the tests. */
export async function renderReport(snapshot: ReportSnapshot, opts: RenderOptions = {}): Promise<RenderResult> {
  registerFonts();
  const { pages: expected, total: expectedTotal } = expectedLayout(snapshot);
  const base = {
    snapshot,
    accent: safeAccent(snapshot.agency.accent),
    period: formatPeriod(snapshot.period),
    logo: toPdfLogo(opts.logo),
    measure: await loadMeasure(),
  };
  const first = { ...base, pages: expected, probe: new PageProbe() };
  const pdf = await draw(first);
  if (first.probe.matches(expected)) {
    return { pdf, pages: first.probe.merged(expected), expected, expectedTotal, redrawn: false };
  }
  // A section spilled onto an extra page: draw once more with the real page numbers in the contents list. The
  // numbers are short, so the second drawing lands every section where the first one did.
  const pages = first.probe.merged(expected);
  const second = { ...base, pages, probe: new PageProbe() };
  return { pdf: await draw(second), pages: second.probe.merged(pages), expected, expectedTotal, redrawn: true };
}

/** The report PDF for one frozen snapshot, as a Node Buffer. */
export async function renderReportPdf(snapshot: ReportSnapshot, opts: RenderOptions = {}): Promise<Buffer> {
  return (await renderReport(snapshot, opts)).pdf;
}
