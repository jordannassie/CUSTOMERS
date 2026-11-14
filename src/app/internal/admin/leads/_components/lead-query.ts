// The Leads view lives in the address (admin audit 2026-11-12): the filters, the page and the open lead (?lead=),
// so Back works and a lead or a filtered list can be shared. Pure, so the server page and the client read it alike.

export type LeadsView = {
  page: number;
  search: string;
  interest: string;
  source: string;
  status: string;
  unread: boolean;
  /** "yes" or "no"; "" for either. */
  replied: "" | "yes" | "no";
  /** An admin's email, "none" for nobody yet, "" for anyone. */
  handler: string;
};

export const EMPTY_VIEW: LeadsView = { page: 1, search: "", interest: "", source: "", status: "", unread: false, replied: "", handler: "" };

type Params = URLSearchParams | Record<string, string | string[] | undefined>;

function read(params: Params, key: string): string {
  if (params instanceof URLSearchParams) return params.get(key) ?? "";
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

const short = (value: string, max = 200) => value.trim().slice(0, max);

/** "none", or something shaped like an email address; anything else means anyone. */
function handlerParam(value: string): string {
  const v = value.trim().toLowerCase();
  return v === "none" || /^[^\s@]{1,64}@[^\s@]{1,255}$/.test(v) ? v : "";
}

export function viewFromParams(params: Params): LeadsView {
  const page = Number.parseInt(read(params, "page"), 10);
  const replied = read(params, "replied");
  return {
    page: Number.isFinite(page) && page > 1 ? page : 1,
    search: short(read(params, "q")),
    interest: short(read(params, "interest"), 40),
    source: short(read(params, "source"), 40),
    status: short(read(params, "status"), 40),
    unread: read(params, "unread") === "1",
    replied: replied === "yes" || replied === "no" ? replied : "",
    handler: handlerParam(read(params, "handler")),
  };
}

/** The open lead's id from ?lead=, when it looks like one. */
export function leadIdFromParams(params: Params): string | null {
  const id = read(params, "lead");
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

/** "?q=sam&status=new&lead=..." for the address bar; only what differs from the plain list. */
export function viewQuery(view: LeadsView, leadId: string | null): string {
  const p = new URLSearchParams();
  if (view.search) p.set("q", view.search);
  if (view.interest) p.set("interest", view.interest);
  if (view.source) p.set("source", view.source);
  if (view.status) p.set("status", view.status);
  if (view.unread) p.set("unread", "1");
  if (view.replied) p.set("replied", view.replied);
  if (view.handler) p.set("handler", view.handler);
  if (view.page > 1) p.set("page", String(view.page));
  if (leadId) p.set("lead", leadId);
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}

/** The same view as the leads API's query string. */
export function apiQuery(view: LeadsView): string {
  const p = new URLSearchParams({ page: String(view.page), search: view.search, interest: view.interest, source: view.source, status: view.status });
  if (view.unread) p.set("unread", "1");
  if (view.replied) p.set("replied", view.replied);
  if (view.handler) p.set("handler", view.handler);
  return p.toString();
}

/** One key per list, so a list is fetched again only when the filters or the page change, not when a lead opens. */
export function viewKey(view: LeadsView): string {
  return apiQuery(view);
}

export function isFiltered(view: LeadsView): boolean {
  return Boolean(view.search || view.interest || view.source || view.status || view.unread || view.replied || view.handler);
}
