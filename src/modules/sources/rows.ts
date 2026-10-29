// The Sources page's rows with their buttons and whether each site is already in Actions. Pure.
import type { ActionStatus } from "@/modules/opportunities";
import { ctaFor, fixFor, impactFor, listedFirst, siteAction, siteKey, usedLine, type Cta, type Impact, type SiteAction } from "./listings";
import type { Site, SourcesView } from "./service";

export type SiteRow = Site & {
  cta: Cta;
  /** What "Get listed" adds to Actions; null when the row has no such button. */
  action: SiteAction | null;
  /** The Actions column it is in, once added ("In Actions · To do"). */
  inActions: ActionStatus | null;
  /** That fix's id, so "In Actions" opens it on the board. */
  actionId: string | null;
};

export type ListedSite = {
  host: string;
  kindLabel: string;
  /** "Used in 33 answers that did not name you." */
  used: string;
  fix: string;
  impact: Impact;
  action: SiteAction;
  inActions: ActionStatus | null;
  actionId: string | null;
};

type Opts = { place: string | null; toolLabel: string | null };

/** The keys to look up in Actions: every site that has an "Add to Actions" button. */
export function actionKeys(view: SourcesView): string[] {
  const hosts = [...listedFirst(view.sites), ...view.sites.filter((s) => ctaFor(s) === "listed")].map((s) => s.host);
  return [...new Set(hosts)].map(siteKey);
}

export function sourceRows(
  view: SourcesView,
  opts: Opts,
  states: Map<string, { id?: string; status: ActionStatus }>,
): { listed: ListedSite[]; rows: SiteRow[] } {
  const inActions = (host: string) => states.get(siteKey(host))?.status ?? null;
  const actionId = (host: string) => states.get(siteKey(host))?.id ?? null;
  const listed = listedFirst(view.sites).map((s) => ({
    host: s.host,
    kindLabel: s.kindLabel,
    used: usedLine(s),
    fix: fixFor(s, opts.place),
    impact: impactFor(s.answers, view.answers),
    action: siteAction(s, view.answers, opts),
    inActions: inActions(s.host),
    actionId: actionId(s.host),
  }));
  const rows = view.sites.map((s) => {
    const cta = ctaFor(s);
    return { ...s, cta, action: cta === "listed" ? siteAction(s, view.answers, opts) : null, inActions: inActions(s.host), actionId: actionId(s.host) };
  });
  return { listed, rows };
}
