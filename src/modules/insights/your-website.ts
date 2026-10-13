// What we know about the business's own website from setup (business_site_facts). Pure. A site that blocked our
// reader is not the same as no website, and must never get "build a website" advice (BUG-087).
import { z } from "zod";

export type YourWebsite = {
  /** read: we read at least one page. blocked: it refused automated readers. unreachable: it did not load. */
  readStatus: "read" | "blocked" | "unreachable";
  /** Pages we read. We only open a few common paths, so a path we did not find is never reported (BUG-115). */
  pagesRead: string[];
  /** Null when no page was read, so we cannot say. */
  hasPhone: boolean | null;
  hasAddress: boolean | null;
  servicesListed: string[];
};

const pages = z.object({ pages: z.array(z.object({ path: z.string(), status: z.string() })) });
const facts = z.object({ phone: z.string(), address: z.string(), services: z.array(z.string()) });
// Saved since BUG-138: what the pages show, apart from facts a chain's branch rule cleared. Older rows lack it.
const contact = z.object({ hasPhone: z.boolean(), hasAddress: z.boolean() });

/** Null when setup saved nothing about the site. */
export function yourWebsite(saved: unknown): YourWebsite | null {
  const site = pages.safeParse(saved);
  if (!site.success || site.data.pages.length === 0) return null;
  const read = facts.safeParse((saved as { facts?: unknown }).facts);
  const list = site.data.pages;
  if (read.success) {
    const shown = contact.safeParse((saved as { contact?: unknown }).contact);
    return {
      readStatus: "read",
      pagesRead: list.filter((p) => p.status === "ok").map((p) => p.path),
      hasPhone: shown.success ? shown.data.hasPhone : read.data.phone.trim() !== "",
      hasAddress: shown.success ? shown.data.hasAddress : read.data.address.trim() !== "",
      servicesListed: read.data.services,
    };
  }
  return {
    readStatus: list.some((p) => p.status === "blocked") ? "blocked" : "unreachable",
    pagesRead: [],
    hasPhone: null,
    hasAddress: null,
    servicesListed: [],
  };
}
