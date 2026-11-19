// Which pages of a business's site auto-fill reads (2026-10-13). What a business offers lives on its services, menu or
// products page, which the fixed pages missed: with services filled in, a test business's questions all named what
// it does; with them empty, about a third were general. Pure.

/** Read at once, alongside the home page. */
export const FIRST_PAGES = ["/", "/about"] as const;
/** The services page, when the home page links to one. */
export const SERVICE_PATHS = ["/services", "/our-services", "/menu", "/products"] as const;
/** When no services page or menu link fills the slots, the addresses read before. */
export const FALLBACK_PAGES = ["/contact", "/about-us"] as const;
export const MAX_PAGES = 5;
const MENU_LINKS = 3;

export type PageKind = "services" | "menu";
export type FollowPage = { path: string; kind?: PageKind };

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
const host = (h: string) => h.toLowerCase().replace(/^www\./, "");

/** The path of a link on the same site ("/services"), or null for another site, a file, an anchor or the home page. */
export function sitePath(href: string, domain: string): string | null {
  const raw = decode(href.trim());
  if (!raw || raw.startsWith("#") || /^(mailto|tel|javascript|sms):/i.test(raw)) return null;
  try {
    const url = new URL(raw, `https://${domain}/`);
    if (!/^https?:$/.test(url.protocol) || host(url.hostname) !== host(domain)) return null;
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (path === "/" || /\.(pdf|jpe?g|png|gif|webp|svg|zip|docx?|xml)$/i.test(path)) return null;
    return path;
  } catch {
    return null;
  }
}

const hrefs = (html: string) => [...html.matchAll(/<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);

// Never worth reading for facts about the business.
const NOT_CONTENT = /\/(cart|checkout|basket|login|log-in|signin|sign-in|signup|sign-up|register|account|my-account|wp-admin|privacy|terms|cookie|search|feed|category|tag|author)\b/i;
// Menu sections that never list what the business offers: a menu that opens with About, Team and Blog gave three about
// pages and no services (magicplumbing.com). About and contact pages are read anyway.
const NOT_OFFER = /^\/(about|about-us|team|meet-the-team|our-team|join-our-team|careers?|jobs|blog|news|faq|faqs|contact|contact-us|reviews?|testimonials|gallery|financing|locations?|service-areas?)(\/|$)/i;
// "/plumbing-services", "/food-menu", "/our-products": a services page under its own name.
const SERVICES_NAME = /(^|-)(services|menu|products)$/;

/**
 * The services, menu or products page the home page links to: one of SERVICE_PATHS first, else the first link whose
 * last part is named so ("/plumbing-services").
 */
export function servicesPage(html: string, domain: string): string | null {
  const linked = [...new Set(hrefs(html).flatMap((h) => sitePath(h, domain) ?? []).map((p) => p.toLowerCase()))];
  return (
    SERVICE_PATHS.find((p) => linked.includes(p)) ??
    linked.find((p) => !NOT_CONTENT.test(p) && !NOT_OFFER.test(p) && SERVICES_NAME.test(p.split("/").at(-1) ?? "")) ??
    null
  );
}

/**
 * The first links of the site's main menu, the first <nav> (or else <header>), in order, leaving out `skip` and the
 * sections that never list services (about, team, blog...).
 */
export function menuLinks(html: string, domain: string, skip: Iterable<string> = [], max = MENU_LINKS): string[] {
  const skipped = new Set(skip);
  const menu = html.match(/<nav\b[\s\S]*?<\/nav>/i)?.[0] ?? html.match(/<header\b[\s\S]*?<\/header>/i)?.[0] ?? "";
  const paths: string[] = [];
  for (const href of hrefs(menu)) {
    const path = sitePath(href, domain);
    if (!path || NOT_CONTENT.test(path) || NOT_OFFER.test(path) || skipped.has(path) || paths.includes(path)) continue;
    paths.push(path);
    if (paths.length === max) break;
  }
  return paths;
}

/**
 * The pages to read once the home page is back: its services page, or else the first menu links, then the fixed
 * fallbacks, up to MAX_PAGES in all with the first pages. `home` is the home page's raw HTML, null when unread.
 */
export function followPages(home: string | null | undefined, domain: string): FollowPage[] {
  const read = new Set<string>(FIRST_PAGES);
  const out: FollowPage[] = [];
  const add = (path: string, kind?: PageKind) => {
    if (read.has(path) || read.size >= MAX_PAGES) return;
    read.add(path);
    out.push(kind ? { path, kind } : { path });
  };
  const services = home ? servicesPage(home, domain) : null;
  if (services) add(services, "services");
  else if (home) for (const path of menuLinks(home, domain, read)) add(path, "menu");
  for (const path of FALLBACK_PAGES) add(path);
  return out;
}
