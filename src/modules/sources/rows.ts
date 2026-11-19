// The Sources page's rows with their buttons and whether each site is already in Actions. Pure.
import { sourceBrandKey } from "@/lib/source-brand";
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

/**
 * The Actions keys that mean "this site is already in Actions": the one Sources adds ("site:timeout.com") and the one
 * a report fix carries ("report:source:timeout.com", "report:source:google" for any Google host), so a fix added from
 * the report is not offered again here (QA round 2).
 */
export const actionKeysFor = (host: string) => [siteKey(host), `report:source:${sourceBrandKey(host)}`];

/** The keys to look up in Actions: every site that has an "Add to Actions" button. */
export function actionKeys(view: SourcesView): string[] {
  const hosts = [...listedFirst(view.sites), ...view.sites.filter((s) => ctaFor(s) === "listed")].map((s) => s.host);
  return [...new Set(hosts.flatMap(actionKeysFor))];
}

type State = { id?: string; status: ActionStatus; impact?: Impact };

// A site can have two fixes (one added here, one from the report): the one furthest along speaks for it.
const PROGRESS: Record<ActionStatus, number> = { done: 4, in_progress: 3, todo: 2, suggested: 1, dismissed: 0 };
const furthest = (found: State[]) => found.reduce<State | null>((best, s) => (!best || PROGRESS[s.status] > PROGRESS[best.status] ? s : best), null);

export function sourceRows(
  view: SourcesView,
  opts: Opts,
  states: Map<string, State>,
): { listed: ListedSite[]; rows: SiteRow[] } {
  const stateOf = (host: string) => furthest(actionKeysFor(host).flatMap((k) => states.get(k) ?? []));
  const inActions = (host: string) => stateOf(host)?.status ?? null;
  const actionId = (host: string) => stateOf(host)?.id ?? null;
  const listed = listedFirst(view.sites).map((s) => ({
    host: s.host,
    kindLabel: s.kindLabel,
    used: usedLine(s),
    fix: fixFor(s, opts.place),
    // Once in Actions, the same level the Actions card shows, so the two pages never disagree.
    impact: stateOf(s.host)?.impact ?? impactFor(s.answers, view.answers),
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
